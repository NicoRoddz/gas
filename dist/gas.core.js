/**
 * @preserve Copyright 2011, Cardinal Path and Direct Performance.
 *
 * GAS - Google Analytics on Steroids
 * https://bitbucket.org/dpc/gas
 *
 * @author Eduardo Cereto <eduardocereto@gmail.com>
 * $Revision$
 * $Date$
 * Licensed under the MIT license.
 */
(function(window, undefined) {
/**
 * GAS - Google Analytics on Steroids
 *
 * Helper Functions
 *
 * Copyright 2011, Cardinal Path and Direct Performance
 * Licensed under the MIT license.
 *
 * @author Eduardo Cereto <eduardocereto@gmail.com>
 */

/**
 * GasHelper singleton class
 *
 * Should be called when ga.js is loaded to get the pageTracker.
 *
 * @constructor
 */
var GasHelper = function() {
    this['tracker'] = window['_gat']['_getTrackerByName']();
};

/**
 * Returns true if the element is foun in the Array, false otherwise.
 *
 * @param {Array} obj Array to search at.
 * @param {object} item Item to search form.
 * @return {boolean} true if contains.
 */
GasHelper.prototype.inArray = function(obj, item) {
    if (obj && obj.length) {
        for (var i = 0; i < obj.length; i++) {
            if (obj[i] === item) {
                return true;
            }
        }
    }
    return false;
};

/**
 * Checks if the object is an Array
 *
 * @param {object} obj Object to check.
 * @return {boolean} true if the object is an Array.
 */
GasHelper.prototype.isArray = function(obj) {
    return toString.call(obj) === '[object Array]';
};

/**
 * Removes special characters and Lowercase String
 *
 * @param {string} str to be sanitized.
 * @param {boolean} strict_opt If we should remove any non ascii char.
 * @return {string} Sanitized string.
 */
GasHelper.prototype._sanitizeString = function(str, strict_opt) {
    str = str.toLowerCase()
        .replace(/^\ +/, '')
        .replace(/\ +$/, '')
        .replace(/\s+/g, '_')
        .replace(/[áàâãåäæª]/g, 'a')
        .replace(/[éèêëЄ€]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõöøº]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç¢©]/g, 'c');

    if (strict_opt) {
        str = str.replace(/[^a-z0-9_-]/g, '_');
    }
    return str.replace(/_+/g, '_');
};

/**
 * Cross Browser helper to addEventListener.
 *
 * ga_next.js currently have a _addEventListener directive. So _gas will
 * allways prefer that if available, and will use this one only as a fallback
 *
 * @param {HTMLElement} obj The Element to attach event to.
 * @param {string} evt The event that will trigger the binded function.
 * @param {function(event)} ofnc The function to bind to the element.
 * @param {boolean} bubble true if event should be fired at bubble phase.
 * Defaults to false. Works only on W3C compliant browser. MSFT don't support
 * it.
 * @return {boolean} true if it was successfuly binded.
 */
GasHelper.prototype._addEventListener = function(obj, evt, ofnc, bubble) {
    var fnc = function(event) {
        event = event || window.event;
        return ofnc.call(obj, event);
    };
    // W3C model
    if (bubble === undefined) {
        bubble = false;
    }
    if (obj.addEventListener) {
        obj.addEventListener(evt, fnc, !!bubble);
        return true;
    }
    // Microsoft model
    else if (obj.attachEvent) {
        return obj.attachEvent('on' + evt, fnc);
    }
    // Browser don't support W3C or MSFT model, time to go old school
    else {
        evt = 'on' + evt;
        if (typeof obj[evt] === 'function') {
            // Object already has a function on traditional
            // Let's wrap it with our own function inside another function
            fnc = (function(f1, f2) {
                return function() {
                    f1.apply(this, arguments);
                    f2.apply(this, arguments);
                }
            })(obj[evt], fnc);
        }
        obj[evt] = fnc;
        return true;
    }
};

/**
 * GAS - Google Analytics on Steroids
 *
 * Copyright 2011, Cardinal Path and Direct Performance
 * Licensed under the MIT license.
 *
 * @author Eduardo Cereto <eduardocereto@gmail.com>
 */

/**
 * Google Analytics original _gaq.
 *
 * This never tries to do something that is not supposed to. So it won't break
 * in the future.
 */
window['_gaq'] = window['_gaq'] || [];

var _prev_gas = window['_gas'] || [];

// Avoid duplicate definition
if (_prev_gas._accounts_length >= 0) {
    return;
}

//Shortcuts, these speed up the code
var document = window.document,
    toString = Object.prototype.toString,
    hasOwn = Object.prototype.hasOwnProperty,
    push = Array.prototype.push,
    slice = Array.prototype.slice,
    trim = String.prototype.trim,
    sindexOf = String.prototype.indexOf,
    aindexOf = Array.prototype.indexOf,
    url = document.location.href;

/**
 * GAS Sigleton
 * @constructor
 */
function GAS() {
    var self = this;
    self._accounts = {};
    self._accounts_length = 0;
    self._queue = _prev_gas;
    self._default_tracker = '_gas1';
    self.gh = {};
    self._hooks = {
        '_addHook': [self._addHook]
    };
    self.push(function() {
        self.gh = new GasHelper();
    });
}

/**
 * First standard Hook that is responsible to add next Hooks
 *
 * _addHook calls always reurn false so they don't get pushed to _gaq
 * @param {string} fn The function you wish to add a Hook to.
 * @param {function()} cb The callback function to be appended to hooks.
 * @return {boolean} Always false.
 */
GAS.prototype._addHook = function(fn, cb) {
    if (typeof fn === 'string' && typeof cb === 'function') {
        if (typeof _gas._hooks[fn] === 'undefined') {
            _gas._hooks[fn] = [];
        }
        _gas._hooks[fn].push(cb);
    }
    return false;
};

/**
 * Construct the correct account name to be used on _gaq calls.
 *
 * The account name for the first unamed account pushed to _gas is the standard
 * account name. It's pushed without the account name to _gaq, so if someone
 * calls directly _gaq it works as expected.
 * @param {string} acct Account name.
 * @return {string} Correct account name to be used already with trailling dot.
 */
function _build_acct_name(acct) {
    return acct === _gas._default_tracker ? '' : acct + '.';
}

function _gaq_push(arr) {
    if (_gas.debug_mode) {
        try {
            console.log(arr);
        }catch (e) {}
    }
    return window['_gaq'].push(arr);
}

/**
 * Everything pushed to _gas is executed by this call.
 *
 * This function should not be called directly. Instead use _gas.push
 * @return {number} This is the same return as _gaq.push calls.
 */
GAS.prototype._execute = function() {
    var args = slice.call(arguments),
        sub = args.shift(),
        gaq_execute = true,
        i, foo, hooks, acct_name, repl_sub;

    if (typeof sub === 'function') {
        // Pushed functions are executed right away
        return _gaq_push(
            (function(s) {
                return function() {
                    // pushed functions receive helpers through this object
                    s.call(_gas.gh);
                };
            })(sub)
        );

    }else if (typeof sub === 'object' && sub.length > 0) {
        foo = sub.shift();

        if (sindexOf.call(foo, '.') >= 0) {
            acct_name = foo.split('.')[0];
            foo = foo.split('.')[1];
        }else {
            acct_name = undefined;
        }

        // Execute hooks
        hooks = _gas._hooks[foo];
        if (hooks && hooks.length > 0) {
            for (i = 0; i < hooks.length; i++) {
                try {
                    repl_sub = hooks[i].apply(_gas.gh, sub);
                    if (repl_sub === false) {
                        // Returning false from a hook cancel the call
                        gaq_execute = false;
                    }
                    if (repl_sub && repl_sub.length > 0) {
                        // Returning an array changes the call parameters
                        sub = repl_sub;
                    }
                }catch (e) {
                    if (foo !== '_trackException') {
                        _gas.push(['_trackException', e]);
                    }
                }
            }
        }
        // Cancel execution on _gaq if any hook returned false
        if (gaq_execute === false) {
            return 1;
        }
        // Intercept _setAccount calls
        if (foo === '_setAccount') {

            for (i in _gas._accounts) {
                if (_gas._accounts[i] == sub[0]) {
                    // Repeated account
                    if (acct_name === undefined) {
                        return 1;
                    }
                }
            }
            acct_name = acct_name || '_gas' +
                String(_gas._accounts_length + 1);
            // Force that the first unamed account is _gas1
            if (typeof _gas._accounts['_gas1'] == 'undefined' &&
                sindexOf.call(acct_name, '_gas') != -1) {
                acct_name = '_gas1';
            }
            _gas._accounts[acct_name] = sub[0];
            _gas._accounts_length += 1;
            acct_name = _build_acct_name(acct_name);
            return _gaq_push([acct_name + foo, sub[0]]);
        }

        // Intercept _linka and _linkByPost
        if (foo === '_link' || foo === '_linkByPost') {
            args = slice.call(sub);
            args.unshift(foo);
            return _gaq_push(args);
        }

        // If user provides account than trigger event for just that account.
        var acc_foo;
        if (acct_name && _gas._accounts[acct_name]) {
            acc_foo = _build_acct_name(acct_name) + foo;
            args = slice.call(sub);
            args.unshift(acc_foo);
            return _gaq_push(args);
        }

        // Call Original _gaq, for all accounts
        var return_val = 0;
        for (i in _gas._accounts) {
            if (hasOwn.call(_gas._accounts, i)) {
                acc_foo = _build_acct_name(i) + foo;
                args = slice.call(sub);
                args.unshift(acc_foo);
                return_val += _gaq_push(args);
            }
        }
        return return_val ? 1 : 0;
    }
};

/**
 * Standard method to execute GA commands.
 *
 * Everything pushed to _gas is in fact pushed back to _gaq. So Helpers are
 * ready for hooks. This creates _gaq as a series of functions that call
 * _gas._execute() with the same arguments.
 */
GAS.prototype.push = function() {
    var args = slice.call(arguments);
    for (var i = 0; i < args.length; i++) {
        (function(arr) {
            window['_gaq'].push(function() {
                _gas._execute.call(_gas.gh, arr);
            });
        })(args[i]);
    }
};

/**
 * _gas main object.
 *
 * It's supposed to be used just like _gaq but here we extend it. In it's core
 * everything pushed to _gas is run through possible hooks and then pushed to
 * _gaq
 */
window['_gas'] = _gas = new GAS();


/**
 * Hook for _trackExceptions
 *
 * Watchout for circular calls
 */
_gas.push(['_addHook', '_trackException', function(exception, message) {
    _gas.push(['_trackEvent',
        'Exception ' + (exception.name || 'Error'),
        message || exception.message || exception,
        url
    ]);
    return false;
}]);

/**
 * Hook to enable Debug Mode
 */
_gas.push(['_addHook', '_setDebug', function(set_debug) {
    _gas.debug_mode = !!set_debug;
}]);

/**
 * Hook to Remove other Hooks
 *
 * It will remove the last inserted hook from a _gas function.
 *
 * @param {string} func _gas Function Name to remove Hooks from.
 * @return {boolean} Always returns false.
 */
_gas.push(['_addHook', '_popHook', function(func) {
    var arr = _gas._hooks[func];
    if (arr && arr.pop) {
        arr.pop();
    }
    return false;
}]);

/**
 * Hook to set the default tracker.
 *
 * The default tracker is the nameless tracker that is pushed into _gaq_push
 */
_gas.push(['_addHook', '_setDefaultTracker', function(tname) {
    _gas._default_tracker = tname;
}]);
/**
 * Wrap-up
 */
// Execute previous functions
while (_gas._queue.length > 0) {
    _gas.push(_gas._queue.shift());
}

// Import ga.js
if (_gaq && _gaq.length >= 0) {
    (function() {
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = (
            'https:' == document.location.protocol ?
                'https://ssl' :
                'http://www'
        ) +
            '.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
    })();
}

})(window);
