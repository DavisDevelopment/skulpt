var python = (function() {
	var type = function(obj) {
		if ((obj.__proto__ != null) && (obj.__proto__.constructor != null)) {
			return obj.__proto__.constructor.name;
		} else {
			return (typeof obj).slice(0, 2).toUppercase() + (typeof obj).slice(1);
		}
	};
var toPyValue = function(x) {
  var item, __slice = [].slice;
  switch (type(x)) {
    case "String":
      return new Sk.builtin.str(x);
    case "Number":
      return new Sk.builtin.nmber(x);
    case "Array":
      return new Sk.builtin.list((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = x.length; _i < _len; _i++) {
          item = x[_i];
          _results.push(toPyValue(item));
        }
        return _results;
      })());
    case "Function":
      return new Sk.builtin.func(function() {
        var args, v;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return toPyValue(x.apply(null, (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = args.length; _i < _len; _i++) {
            v = args[_i];
            _results.push(getJSValue(v));
          }
          return _results;
        })()));
      });
    case "Object":
	  console.log( x );
      return (function() {
        var key, res, val;
        res = new Sk.builtin.object();
        for (key in x) {
          val = x[key];
          res.GenericSetAttr(key, toPyValue(val));
        }
        return res;
      })();
    default:
      return x;
  }
};

var fromPythonInstance = function( instance ) {
	var props = getJSValue( instance["$d"] );
	console.log( props );
	var pyProto = instance.__proto__, jsProto = {};
	for ( var methodName in pyProto ) {
		if (pyProto.hasOwnProperty(methodName)) {
			try {
				if ( typeof pyProto[methodName] == "function" ) jsProto[methodName] = pyProto[methodName];
				else {
					jsProto[methodName] = getJSValue(pyProto[methodName], instance);
				}
			} catch ( error ) {
				throw "Cannot convert "+methodName+" to JavaScript."+error;
			}
		}
	}
	var jsInstance = Object.create( jsProto );
	for ( var key in props ) {
		if ( props.hasOwnProperty(key) ) jsInstance[key] = props[key];
	}
	return jsInstance;
};
	
var getJSValue = function(x, method) {
  if ( method == null ) method = false;
  if ( x == null || x.tp$name == "NoneType" ) return null;
  var __slice = [].slice;
  var result, value;
  result = null;
  if ( typeof x == "boolean" || x == null ) {
	return x;
  }
  else if (typeof x.v != "undefined") {
    value = x.v;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value == null) {
      return value;
    } else if (Array.isArray(value)) {
      return (function() {
        var el, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = value.length; _i < _len; _i++) {
          el = value[_i];
          _results.push(getJSValue(el));
        }
        return _results;
      })();
    }
  } else {
    if (x.func_code != null) {
      return function() {
        var args, dargs = [];
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
		if ( method != false ) dargs.push(method);
		for ( var i = 0; i < args.length; i++ ) {
			dargs.push(args[i]);
		}
        return getJSValue(x.tp$call(dargs));
      };
    } else {
      return (function() {
		if ( x["$d"] != null && typeof getJSValue(x["$d"]) == "object" ) {
			console.log(type(x));
			return fromPythonInstance(x);
		} else {
			var item, results, _i, _len, _ref;
			results = {};
			try {
				_ref = getJSValue(x.items.tp$call([x]));
				console.log(_ref);
			} catch ( error ) {
				console.log( "fuck" );
				throw error;
			}
			for (_i = 0, _len = _ref.length; _i < _len; _i++) {
			  item = _ref[_i];
			  results[item[0]] = item[1];
			}
			return results;
		}
      })();
    }
  }
};	
var utils = {
	"extend": function( o, p ) {
		var key;
		for (key in p) {
			if (p.hasOwnProperty(key)) {
				o[key] = p[key];
			}
		}
		return o;
	},
	"map": function( o, func ) {
		var result = {};
		for ( var key in o ) {
			if ( o.hasOwnProperty(key) && typeof func == "function" ) result[key] = func(o[key]);
		}
		return result;
	}
};
	var _globals = {};
	var isConfigured = false;
	var exports = {};
	var $_builtins_ = {
		"alert": function(what) {
			if ( typeof what.v === "string" || typeof what.v === "number" )	alert(what.v);
		},
		"prompt": function( question, defaultValue ) {
			return toPyValue(prompt(getJSValue(question), getJSValue(defaultValue)));
		},
		"log": function( pyWhat ) {
			console.log( pyWhat );
		},
		"putGlobal": function( name, func ) {
			window[name.v] = func.func_code;
		},
		"setTimeout": function( func, time ) {
			setTimeout( function() {
				func.func_code();
			}, time.v );
		},
		"setInterval": function( func, time ) {
			setInterval( getJSValue(func), getJSValue(time) );
		},
		"_global": function() {
			Sk.globals = utils.extend(Sk.globals, utils.map(_globals, toPyValue));
			console.log( Sk.globals );
		}
	};
	exports.eval = function(code) {
		if ( !isConfigured ) {
			Sk.configure({
				"output": function(p) { console.log(p); },
				"read": function(x) {
					if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) throw "File not found: '" + x + "'";
					return Sk.builtinFiles["files"][x];
				}
			});
			for ( var p in $_builtins_ ) {
				Sk.builtins[p] = $_builtins_[p];
			}
			isConfigured = true;
		}
		var bod = ("_global()\n\n"+code);
		var module = Sk.importMainWithBody("<stdin>", false, bod);
	};
	exports.getGlobal = function( key ) {
		if ( key == null ) return Sk.globals;
		else if ( typeof key === "string" ) {
			var pyResult = Sk.globals[key];
			var jsResult = getJSValue( pyResult );
			jsResult.__type__ = type(pyResult);
			return getJSValue( pyResult );
		}
	};
	exports.setGlobal = function( key, value ) {
		
		_globals[key] = value;
	};
	exports.compile = function(code) {
		return function() {
			exports.eval(code);
		};
	};
	
	return exports;
}());