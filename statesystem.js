

function State(name, elementSelector) {
    this.name = name;
    this.onEnter = [];
    this.onLeave = [];
    this.timeouts = [];
    this.elementSelector = elementSelector;
    var timeouts = this.timeouts;

    this.addEventHandler('leave', function() {
        while (timeouts.length > 0) {
            clearTimeout(timeouts.pop());
        }
    });
}

State.prototype = {
    addEventHandler: function(eventName, block) {
        this._getEventArray(eventName).push(block);
    },

    _getEventArray: function(eventName) {
        if (eventName !== 'enter' && eventName !== 'leave')
            throw new Error('_getEventArray: Unknown event "' + eventName + '"');

        var property = 'on' + eventName.charAt(0).toUpperCase() + eventName.substring(1);
        return this[property];
    },

    fireEvent: function(eventName) {
        var eventArray = this._getEventArray(eventName);
        var element = $(this.elementSelector).get(0);

        for (var i = 0; i < eventArray.length; i++)
            eventArray[i].call(element);
    },

    toString: function() {
        return "State[" + this.name + "]";
    },

    setTimeout: function(block, milliseconds) {
        console.log('State.setTimeout', block, milliseconds);
        var timeout = setTimeout(block, milliseconds);
        this.timeouts.push(timeout);
    }
};


function StateSystem(rootSelector) {
    this.rootSelector = rootSelector;
    this.states = [new State("start", null)];
    this.currentState = this.states[0];
}

StateSystem.prototype = {
    DefineStates: function(/* state1, state2, ... */) {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] == "start")
                throw new Error("DefineStates: 'start' is a reserved state name");
            this.states.push(new State(arguments[i], this.rootSelector));
        }
    },

    Find: function(selector) {
        return new ElementContext(this, selector);
    },

    Goto: function(stateName) {
        if (stateName == 'start')
            throw new Error("Goto: Can not go to start state");

        var newState = this.getStateByName(stateName);

        this.currentState.fireEvent('leave');
        this.currentState = newState;
        this.currentState.fireEvent('enter');
    },

    Cycle: function(/* stateName1, stateName2, ... */) {
        var nextStateIndex = 0;
        for (var i = 0; i < arguments.length; i++) {
            if (this.currentState.name == arguments[i]) {
                nextStateIndex = i + 1;
                break;
            }
        }
        nextStateIndex %= arguments.length;
        this.Goto(arguments[nextStateIndex]);
    },

    In: function(stateName) {
        var state = this.getStateByName(stateName);
        return new InStateContext(this, state);
    },

    InAny: function() {
        return new InStateContext(this, null);  
    },

    Enter: function(stateName) {
        var state = this.getStateByName(stateName);
        return new StateChangeContext('enter', state);
    },

    Leave: function(stateName) {
        var state = this.getStateByName(stateName);
        return new StateChangeContext('leave', state);
    },

    IsIn: function(stateName) {
        return this.currentState.name == stateName;
    },

    getStateByName: function(name) {
        for (var i = 0; i < this.states.length; i++) {
            if (this.states[i].name == name)
                return this.states[i];
        }
        throw new Error("getStateByName: No state named " + name);
    }
};

StateSystem.prototype.SetupDebug = function() {
    var system = this;
    $.each(this.states, function(i, state) {
        system.Enter(state.name).Do(function() {
            console.log('Entered ' + state.name);
        });
    });
};


function StateChangeContext(eventName, state) {
    this.eventName = eventName;
    this.state = state;
}

StateChangeContext.prototype = {
    Do: function(block) {
        this.state.addEventHandler(this.eventName, block);
    }
};

function ElementContext(stateSystem, selector) {
    this.stateSystem = stateSystem;
    this.selector = selector;
}

ElementContext.prototype = {
    StateProperty: function(property, values) {
        for (var stateName in values) {
            var state = this.stateSystem.getStateByName(stateName);
            state.addEventHandler('enter', createEventHandler(this.selector, property, values[stateName]));
        }

        function createEventHandler(selector, property, value) {
            return function() {
                $(selector)[property](value)
            };
        }
    },

    On: function(domEventDescription) {
        domEventDescription = DomEventDescription.normalize(domEventDescription);
        return new DomEventContext(this.stateSystem, null, this.selector, domEventDescription);
    }
};

function DomEventDescription(eventName, conditionBlock) {
    this.eventName = eventName;
    this.conditionBlock = conditionBlock || function() {
        return true
    };
}

DomEventDescription.normalize = function(domEventDescription) {
    if (typeof domEventDescription === 'string')
        domEventDescription = new DomEventDescription(domEventDescription, null);
    return domEventDescription;
};

function DomEventContext(stateSystem, limitState, selector, domEventDescription) {
    this.stateSystem = stateSystem;
    this.limitState = limitState;
    this.selector = selector;
    this.domEventDescription = domEventDescription;
}

DomEventContext.prototype = {
    Goto: function(stateName) {
        var stateSystem = this.stateSystem;
        this.Do(function() {
            stateSystem.Goto(stateName);
        });
    },

    Do: function(block) {
        var stateSystem = this.stateSystem;
        var limitState = this.limitState;
        var domEventDescription = this.domEventDescription;

        $(this.selector).bind(domEventDescription.eventName, function(domEvent) {
            if (limitState != null && !stateSystem.IsIn(limitState.name))
                return;
            if (!domEventDescription.conditionBlock(domEvent))
                return;

            block.call(this, domEvent);

            domEvent.stopImmediatePropagation(); // stop other event handlers
        });
    },

    Cycle: function() {
        var stateSystem = this.stateSystem;
        var states = Array.prototype.slice.call(arguments);

        this.Do(function() {
            stateSystem.Cycle.apply(stateSystem, states);
        });
    }
};

function InStateContext(stateSystem, state) {
    this.stateSystem = stateSystem;
    this.state = state;
}

InStateContext.prototype = {
    Find: function(selector) {
        return new InStateAndElementContext(this.stateSystem, this.state, selector);
    },

    On: function(domEventDescription) {
        domEventDescription = DomEventDescription.normalize(domEventDescription);
        return new DomEventContext(this.stateSystem, this.state, this.stateSystem.rootSelector, domEventDescription);
    },

    After: function(milliseconds) {
        return new TimeContext(this.stateSystem, this.state, milliseconds);
    }
};

function InStateAndElementContext(stateSystem, state, selector) {
    this.stateSystem = stateSystem;
    this.state = state;
    this.selector = selector;
}

InStateAndElementContext.prototype = {
    On: function(domEventDescription) {
        domEventDescription = DomEventDescription.normalize(domEventDescription);
        return new DomEventContext(this.stateSystem, this.state, this.selector, domEventDescription);
    }
};

function TimeContext(stateSystem, state, milliseconds) {
    this.stateSystem = stateSystem;
    this.state = state;
    this.milliseconds = milliseconds;
}

TimeContext.prototype = {
    // TODO: Fix so that this works even though state==null (i.e. when we're in IsAny context)
    Do: function(block) {
        // Note - incorrect... should not need to know the last step in the chain (i.e. After/Every)
        // For now, we only support After
        var state = this.state;
        var milliseconds = this.milliseconds;
        this.stateSystem.Enter(state.name).Do(function() {
            state.setTimeout(block, milliseconds);
        });
    },

    Goto: function(stateName) {
        var stateSystem = this.stateSystem;
        this.Do(function() {
            stateSystem.Goto(stateName);
        });
    }
};


var KeyUp = new DomEventDescription('keyup');
var KeyDown = new DomEventDescription('keydown');

(function(){
    var keyCodes = {
        Escape: 27,
        Enter: 13,
        Up: 38,
        Down: 40,
        Left: 37,
        Right: 39
    };

    function setupKeyEvents(object, domEventName) {
        for (var eventName in keyCodes)
            object[eventName] = createEventDescription(domEventName, keyCodes[eventName]);
    }

    function createEventDescription(eventName, keyCode) {
        return new DomEventDescription(eventName, function(ev) { return ev.keyCode === keyCode });
    }

    setupKeyEvents(KeyUp, 'keyup');
    setupKeyEvents(KeyDown, 'keydown');
})();
