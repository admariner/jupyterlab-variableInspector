export
namespace Languages {
    export
        type LanguageModel = {
            initScript: string;
            queryCommand: string;
            matrixQueryCommand: string;
        }
}

export
    abstract class Languages {
    /**
     * Init and query script for supported languages.
     */

    static py_script: string = `import json
from sys import getsizeof
from IPython import get_ipython
from IPython.core.magics.namespace import NamespaceMagics


_jupyterlab_variableinspector_nms = NamespaceMagics()
_jupyterlab_variableinspector_Jupyter = get_ipython()
_jupyterlab_variableinspector_nms.shell = _jupyterlab_variableinspector_Jupyter.kernel.shell

_jupyterlab_variableinspector_maxrows = 10**6 # None for view all

try:
    import numpy as np
except ImportError:
    np = None

try:
    import pandas as pd
except ImportError:
    pd = None

try:
    import pyspark
except ImportError:
    pyspark = None

try:
    import tensorflow as tf
    import keras.backend as K
except ImportError:
    tf = None


def _jupyterlab_variableinspector_getsizeof(x):
    if type(x).__name__ in ['ndarray', 'Series']:
        return x.nbytes
    elif pyspark and isinstance(x, pyspark.sql.DataFrame):
        return "?"
    elif tf and isinstance(x, tf.Variable):
        return "?"
    elif pd and type(x).__name__ == 'DataFrame':
        return x.memory_usage().sum()
    else:
        return getsizeof(x)


def _jupyterlab_variableinspector_getshapeof(x):
    if pd and isinstance(x, pd.DataFrame):
        return "DataFrame [%d rows x %d cols]" % x.shape
    if pd and isinstance(x, pd.Series):
        return "Series [%d rows]" % x.shape
    if np and isinstance(x, np.ndarray):
        shape = " x ".join([str(i) for i in x.shape])
        return "Array [%s]" %  shape
    if pyspark and isinstance(x, pyspark.sql.DataFrame):
        return "Spark DataFrame [? rows x %d cols]" % len(x.columns)
    if tf and isinstance(x, tf.Variable):
        shape = " x ".join([str(int(i)) for i in x.shape])
        return "Tensorflow Variable [%s]" % shape
    return None


def _jupyterlab_variableinspector_getcontentof(x):
    # returns content in a friendly way for python variables
    # pandas and numpy
    if pd and isinstance(x, pd.DataFrame):
        colnames = ', '.join(list(x.columns))
        return "Column names: %s" % colnames
    if pd and isinstance(x, pd.Series):
        return "Series [%d rows]" % x.shape
    if np and isinstance(x, np.ndarray):
        return x.__repr__()
    if pyspark and isinstance(x, pyspark.sql.DataFrame):
        return x.__repr__()
    if tf and isinstance(x, tf.Variable):
        # This is to allow tf.Variable.__repr__ to appear
        return x.__repr__().replace("<", "").replace(">", "").strip()
    return str(x)[:200]


def _jupyterlab_variableinspector_is_matrix(x):
    # True if type(x).__name__ in ["DataFrame", "ndarray", "Series"] else False
    if pd and isinstance(x, pd.DataFrame):
        return True
    if pd and isinstance(x, pd.Series):
        return True
    if np and isinstance(x, np.ndarray):
        return True
    if pyspark and isinstance(x, pyspark.sql.DataFrame):
        return True
    if tf and isinstance(x, tf.Variable):
        return True
    return False


def _jupyterlab_variableinspector_dict_list():
    def keep_cond(v):
        if isinstance(eval(v), str):
            return True
        if tf and isinstance(eval(v), tf.Variable):
            return True
        if str(eval(v))[0] == "<":
            return False
        if  v in ['np', 'pd', 'pyspark', 'tf']:
            return eval(v) is not None
        if str(eval(v)).startswith("_Feature"):
            # removes tf/keras objects
            return False
        return True
    values = _jupyterlab_variableinspector_nms.who_ls()
    vardic = [{'varName': _v, 
    'varType': type(eval(_v)).__name__, 
    'varSize': str(_jupyterlab_variableinspector_getsizeof(eval(_v))), 
    'varShape': str(_jupyterlab_variableinspector_getshapeof(eval(_v))) if _jupyterlab_variableinspector_getshapeof(eval(_v)) else '', 
    'varContent': str(_jupyterlab_variableinspector_getcontentof(eval(_v))), 
    'isMatrix': _jupyterlab_variableinspector_is_matrix(eval(_v))}
            for _v in values if keep_cond(_v)]
    return json.dumps(vardic)


def _jupyterlab_variableinspector_getmatrixcontent(x):
    def get_np_threshold():
        if np and np.get_printoptions()['threshold'] != 1000: # this is the default
            return np.get_printoptions()['threshold']
        return _jupyterlab_variableinspector_maxrows
    
    def get_pd_threshold():
        if pd and pd.get_option('max_rows') != 60:
            return pd.get_option('max_rows')
        return _jupyterlab_variableinspector_maxrows
    
    def get_threshold(np_thres, pd_thres):
        if np_thres is None:
            return pd_thres
        elif pd_thres is None:
            return np_thres
        elif np_thres < 0 or pd_thres < 0:
            return None
        else:
            return max(np_thres, pd_thres)
        
    np_threshold = get_np_threshold()
    pd_threshold = get_pd_threshold()
    threshold = get_threshold(np_threshold, pd_threshold)

    if pd and pyspark and isinstance(x, pyspark.sql.DataFrame):
        df = x.limit(threshold).toPandas()
        return _jupyterlab_variableinspector_getmatrixcontent(df.copy())
    elif np and pd and type(x).__name__ in ["Series", "DataFrame"]:
        if threshold is not None:
            x = x.head(threshold)
        x.columns = x.columns.map(str)
        response = {"schema": pd.io.json.build_table_schema(x), "data": x.to_dict(orient="records")}
        return json.dumps(response, default=_jupyterlab_variableinspector_default)
    elif np and pd and type(x).__name__ in ["ndarray"]:
        df = pd.DataFrame(x)
        if threshold is not None:
            df = df.head(threshold)
        df.columns = df.columns.map(str)
        response = {"schema": pd.io.json.build_table_schema(df), "data": df.to_dict(orient="records")}
        return json.dumps(response,default=_jupyterlab_variableinspector_default)
    elif tf and isinstance(x, tf.Variable):
        df = K.get_value(x)
        return _jupyterlab_variableinspector_getmatrixcontent(df)

def _jupyterlab_variableinspector_default(o):
    if isinstance(o, np.number): return int(o)  
    raise TypeError
`;
    
    static scripts: { [index: string]: Languages.LanguageModel } = {
        "python3": {
            initScript: Languages.py_script,
            queryCommand: "_jupyterlab_variableinspector_dict_list()",
            matrixQueryCommand: "_jupyterlab_variableinspector_getmatrixcontent"
        }
    };

    public static getScript( lang: string ): Promise<Languages.LanguageModel> {
        return new Promise( function( resolve, reject ) {
            if ( lang in Languages.scripts ) {
                resolve( Languages.scripts[lang] );
            } else {
                reject( "Language " + lang + " not supported yet!" );
            }
        } );

    }

}



