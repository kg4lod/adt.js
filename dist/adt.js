/*
 * adt.js - Algebraic Data Types for JavaScript
 * adt.js is free, public domain software (http://creativecommons.org/publicdomain/zero/1.0/)
 * Originally created by Rehno Lindeque of http://www.mischievousmeerkat.com
 */
var adt = (function() {
"use strict";
  // Define a local copy of adt
  var
    init = function(selfProto, args) {
      var i, key, strA;
      for (i = 0; i < args.length; ++i) {
        var a = args[i];
        if (Array.isArray(a))
          init(selfProto, a);
        else if (typeof(a) === 'string' || typeof(a) === 'number') {
          if (a !== '_' && String(a).charAt(0) === '_')
            continue; // ignore constructors for private members starting with _
          else
            selfProto[a] = makeConstructor(a);
        }
        else if (typeof(a) === 'object' || typeof(a) == 'function') {
          for (key in a)
            if (key !== '_' && key.charAt(0) === '_')
              continue; // ignore evaluators for private members starting with _
            else if (typeof(a[key]) === 'function')
              selfProto[key] = a[key];
            else
              selfProto[key] = function() { return a[key]; };
        }
        else
          continue; // TODO: WARNING: unidentified argument passed to adt
      }
    },
    adt = function() {
      // Arguments to this function can be either constructor names (strings or 
      // arrays of strings, numbers or arrays of numbers) or evaluators (dispatch tables or arrays of dispatch
      // tables with keys as deconstructors and values as dispatch functions)
      var selfProto = {};
      init(selfProto, arguments);
      return evaluator(selfProto);
    },
    makeConstructor = function(identifier) { 
      return function() {
        // (make sure the identifier is a string not a number to call the correct Array constructor)
        var data = [String(identifier)].concat([].slice.call(arguments, 0));
        data._ADTData = true;
        return data;
      }; 
    },
    unescapeString = function(str) {
      var
        i,
        result = '',
        escapes = {
          '\\': '\\',
          '\"': '\"',
          '\'': '\'',
          't': '\t',
          'r': '\r',
          'n': '\n'
        };
      for (i = 0; i < str.length - 1; ++i) {
        if (str[i] !== '\\')
          result += str[i];
        else {
          replacement = escapes[str[i + 1]]
          result += (replacement == null? str[i + 1] : replacement);
          ++i;
        }          
      }
      // Add the last character if it wasn't escaped
      return i === str.length - 1? result + str[str.length - 1] : result;
    },
    escapeString = function(str) {
      var 
        i, 
        result = '',
        replacement,
        escapes = {
          '\\': '\\\\',
          '\"': '\\\"',
          '\'': '\\\'',
          '\t': '\\t',
          '\r': '\\r',
          '\n': '\\n'
        };
      for (i = 0; i < str.length; ++i) {
        replacement = escapes[str[i]];
        result += (replacement == null? str[i] : replacement);
      }
      return result;
    };

  // ADT evaluator api
  var 
    evaluator = function(selfProto) {
      var 
        key,
        evaluator = function(){
          return evaluator.eval.apply(self, arguments);
        },
        self = Object.create(selfProto);

      evaluator.eval = function(data) { 
        // Determine if the data is a type name (a data type constructor name)
        if (typeof data === 'string' || typeof data === 'number') {
          // TODO (version 2): perform pattern matching
          // E.g. split the data around whitespace and in order of specific to general...
          var result;
          self._key = self._pattern = data;
          if (typeof evaluator[data] === 'function')
            result = evaluator[data].apply(self, [].slice.call(arguments, 1));
          else
            result = evaluator['_'].apply(self, [].slice.call(arguments, 1));
          /*
          if (Array.isArray(result) && result['_ADTData'] === true)
            return result;
          result = [result];
          //result._ADTPrimitive = true;*/
          return result;
        }
        // Determine if the data is a construction (built by a constructor)
        if (Array.isArray(data) && data['_ADTData'] === true) {
          //assert(data.length > 0, "It shouldn't be possible to have empty ADT constructions");
          // Evaluate sub-trees
          var
            result = new Array(data.length),
            key = '',
            i;
          result._ADTData = true;
          for (i = 1; i < data.length; ++i) {
            var subResult = (Array.isArray(data[i]) && data[i]['_ADTData'] === true)? evaluator.eval(data[i]) : data[i];
            if (Array.isArray(subResult) && subResult['_ADTData'] === true) {
              key = key.concat(' '.concat(subResult[0]));
              result[i] = subResult;
            }
            else {
              key = key.concat(' '.concat(typeof subResult));
              result[i] = subResult;
            }
          }
          // TODO (version 2): for pattern matching
          //result[0] = key;
          result[0] = data[0];
          self._key = self._pattern = result[0]; //key
          return evaluator.eval.apply(self, result);
        }
        // If the argument is neither a constructor name, nor a construction (ADTData)
        // then simply return it
        return data;
      };

      /* TODO (version 2/3)?
      // Iterate over an array of values (while carrying state, like a finite state machine)
      // Similar to a haskell enumerator + iteratee with "map" as the enumerator and "iteratee" as the iteratee carying state
      evaluator.mapIteratee = function() { console.log("mapIterate", arguments); return 0; };

      // Similar to a haskell enumerator + iteratee with "fold" as the enumerator and "iteratee" as the iteratee carying state
      evaluator.foldIteratee = function() { console.log("iterate", arguments); return 0; };
      */

      // Add adt constructors / methods to the evaluator
      for (key in selfProto)
        if (key !== 'eval') {
          if (typeof selfProto[key] === 'function')
            // Custom evaluator
            evaluator[key] = (function(key){ return function(){ return selfProto[key].apply(self, arguments); }; })(key);
          else 
            // Constant constructor (return the constant value)
            evaluator[key] = (function(key){ return function(){ return selfProto[key]; }; })(key);
        }
        // TODO: else
        //   Warning? trying to overide standard functions

      /* TODO: Can't work right now because the data isn't available
      // Create an identity constructor for the default constructor if none was supplied
      if (typeof selfProto['_'] === 'undefined') {
        selfProto['_'] = function(data){ return data; };
        evaluator['_'] = function(){ return selfProto['_'].apply(self, arguments); }
      }*/
      
      return evaluator;
    };

  // Automatically create constructors for any dispatch table
  adt.constructors = function(obj) {
    var key, keys = [];
    if (obj != null)
      for (key in obj)
        keys.push(key);
    return adt.apply(null, keys);
  };

  // Create ADT's from an object's own property names (both enumerable + non-enumerable)
  adt.own = function() {
    var i, j, arg, names, key, dispatchTable = {};
    for (i = 0; i < arguments.length; ++i) {
      arg = arguments[i];
      names = Object.getOwnPropertyNames(arg);
      for (j = 0; j < names.length; ++j) {
        key = names[j];
        dispatchTable[key] = arg[key];
      }
    }
    return adt(dispatchTable);
  }
  adt.own.constructors = function(obj) {
    var i, names = [];
    for (i = 0; i < arguments.length; ++i)
      names.push(Object.getOwnPropertyNames(arguments[i]));
    return adt.apply(null, Array.prototype.concat.apply([], names));
  };

  adt.deconstruct = function(data){
    return (data && data['_ADTData'] === true? 
      { key: data[0], value: data.slice(1) } : 
      { key: typeof data, value: data });
  };

  adt.serialize = function(){
    var 
    serializeEval = adt('serialized', 
      {'_': function() { 
        var i, str = this._key, data;
        for (i = 0; i < arguments.length; ++i) {
          data = adt.deconstruct(arguments[i]);
          str += ' ' + (data.key === 'string'? '"' + data.value + '"' : (data.key === 'serialized'? "(" + data.value + ")" : String(data.value)));
        }
        return this.serialized(str); 
      }}
    );
    
    return String(adt.deconstruct(serializeEval.apply(serializeEval, arguments)).value);
  };

  var 
    eatWhiteSpace = function(str) {
      for (var i = 0; i < str.length; ++i) {
        switch (str[i]) {
          case ' ':
          case '\n': 
          case '\r': 
          case '\t':  
            continue;
        }
        return str.slice(i);
      }
      return '';
    },

    // TODO: id's will be escaped...

    lexString = function(str) {
      var i, searchIndex = 1;
      // pre-condition: str.length > 1
      while (true) {
        searchIndex = string.indexOf(str[0], searchIndex);
        if (searchIndex === -1)
          throw "No closing quotation mark was found for the string starting with " + str.slice(0, Math.min(5, str.length)) + "...";
        // Check if there's an odd number of escape characters before the quotation mark character
        for (i = searchIndex - 1; i > 0; --i)
          if (str[i] !== '\\') {
            if ((searchIndex - i) & 1 === 1) // There is an even number of slashes
              return { head: str.slice(0, searchIndex + 1), tail: str.slice(searchIndex + 1) };
            else // There is an odd number of slashes
              break;
          }
      }
    },
    lex = function(str) {
      var 
        nextWhiteSpace;
      str = eatWhiteSpace(str);
      if (str.length === 0)
        return ['','']; // empty string
      switch (str[0]) {
        case '(':
        case ')':
        case '"': 
        case '\'':
        case '[':
        case ']':
        case ',': 
          return { head: str[0], tail: str.slice(1) };
      }
      for (var i = 0; i < str.length; ++i) {
        switch (str[i]) {
          case '(':
          case ')':
          case '[':
          case ']':
          case ',':
          case ' ':
          case '\n':
          case '\r':
          case '\t':
            return { head: str.slice(0, i), tail: str.slice(i) };
          case '"': 
          case '\'':
            return lexString(str);
        }
      }
    },
    parseADTTail = function(stack, input) {
      //var 
      //  head = input[0],
      //  tail = input.slice(1);
      // TODO...
      //return tail;
    },
    parseArrayTail = function(stack, input) {
      if (input.length < 2)
        throw "No closing bracket found for array [...";
      // TODO...
      //return tail;
    },
    parseArg = function(stack, input) {
      // pre-condition: input.length > 0
      var head = input[0], tail = input.slice(1);
      if (head.length === 0)
        return tail; // no argument (two whitespace characters next to each other causes this)
      switch (head) {
        case '(':
          tail = parseADTTail(stack, tail);
          // post-condition: tail.length === 0
          // post-condition: stack.length === 1
          return tail;
        case '[':
          tail = parseArrayTail(stack, tail);

          return tail;
      }
      switch (head[0]) {
        case '\"':
          //pre-condition: head[head.length - 1] === '\"'
          //pre-condition: head.length > 1
          stack[stack.length - 1].push(unescapeString(head.slice(1, head.length - 1)));
          return tail;
        case '\'':
          //pre-condition: head[head.length - 1] === '\"'
          //pre-condition: head.length > 1
          stack[stack.length - 1].push(unescapeString(head.slice(1, head.length - 1)));
          return tail;
      }
      throw "Unexpected token `" + head + "` in data";
    },
    parse = function(input) {
      // post-condition: tail.length === 0
      // post-condition: stack.length === 1
    };
  adt.deserialize = function(str){
    var
      lexemes = [],
      lexState = { head: '', tail: str },
      stack = [];
    while (lexState.tail.length > 0) {
      lexState = lex(lexState.tail);
      lexemes.push(lexState.head);
    }
    // Remove all empty lexemes from the start of the array
    while (lexemes.length > 0 && lexemes[0].length == 0)
      lexemes = lexemes.slice(1);
    // Test whether the list of lexemes is empty (the string was empty or whitespace only)
    if (lexemes.length == 0)
      return;
    // Allow lisp style constructors with starting and ending parentheses
    if (lexemes[0] === '(')
      if (lexemes[lexemes.length - 1] !== ')') {
        lexemesStr = lexemes.join(' ');
        throw "Optional opening parenthesis used for the data " + lexemesStr.slice(0, Math.min(10, lexemesStr.length)) + "... but could not find the closing parenthesis."
      }
    else {
      // pre-condition: lexemes[0].length > 0 (because empty lexemes at the beginning were removed)
      switch (lexemes[0][0]) {
        case '\"':
        case '\'':
        case '[':
          break; // adt is a string or an array
        default: 
          lexemes = ['('].concat(lexemes).concat([')']);
      }
    }
    return parse(lexemes);
  };
//*/



/*
  var 
    lexADT()
  adt.deserialize = function(str) {
    var
      head,
      tail,
      result;
    if (lexemes.length === 0)
      return;

    head = lexemes[0];
    tail = lexemes.slice(1);
    result = deserializeWithKey(0, head, tail);
    // post-condition: result[1].length === 0
    return result[0];
  };
*/
  // Export adt to a CommonJS module if exports is available
  if (typeof(exports) !== "undefined" && exports !== null)
    exports.adt = adt;
  return adt;
})();

