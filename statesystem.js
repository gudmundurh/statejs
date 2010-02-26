
function State(name) {
	this.name = name;
	this.onEnter = [];
	this.onLeave = [];
	this.timeouts = [];
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
		
		for (var i = 0; i < eventArray.length; i++) 
			eventArray[i]();
	},
	
	toString: function() {
		return "State[" + this.name + "]";
	},
	
	setTimeout: function(block, milliseconds) {
		console.log('State.setTimeout', block, milliseconds)
		var timeout = setTimeout(block, milliseconds);
		this.timeouts.push(timeout);
	}
};


function StateSystem(containerElement) {
	this.containerElement = containerElement;
	this.states = [new State("start")];
	this.currentState = this.states[0];
}

StateSystem.prototype = {
	DefineStates: function(/* state1, state2, ... */) {
		for (var i = 0; i < arguments.length; i++)
			this.states.push(new State(arguments[i]));
			
		this.currentState = this.states[0];
	},
	
	Find: function(selector) {
		return new ElementContext(this, selector);
	},
	
	Goto: function(stateName) {
		if (!this.currentState)
			throw new Error("Goto: current state not set");
			
		if (stateName == 'start')
			throw new Error("Goto: Can not go to start state");
	
		var newState = this.getStateByName(stateName)
//		if (this.IsIn(stateName))
//			return;
			
		this.currentState.fireEvent('leave');
		this.currentState = newState;
		this.currentState.fireEvent('enter');
	},
	
	Cycle: function(/* stateName1, stateName2, ... */) {
		var nextStateIndex = 0;
		for (var i = 0; i < arguments.length; i++) {
			if (this.currentState.name == arguments[i]) {
				nextStateIndex = i+1;
				break;
			}
		}
		nextStateIndex %= arguments.length;
		this.Goto(arguments[nextStateIndex]);
	},
	
	In: function(stateName) {
		var state = this.getStateByName(stateName);
		return new SpecificStateContext(this, state);
	},
	
	Enter: function(stateName) {
		var state = this.getStateByName(stateName)
		return new StateChangeContext('enter', state);
	},
	
	Leave: function(stateName) {
		var state = this.getStateByName(stateName)
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
}

function StateChangeContext(eventName, state) {
	this.eventName = eventName;
	this.state = state;	
}

StateChangeContext.prototype = {
	Do: function(block) {
		this.state.addEventHandler(this.eventName, block);
	}
}

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
			return function() { $(selector)[property](value) };
		}
	},
	
	On: function(domEventDefinition) {
        domEventDefinition = DomEventDefinition.normalize(domEventDefinition);
		return new DomEventContext(this.stateSystem, null, this.selector, domEventDefinition);
	}
};

function DomEventDefinition(eventName, conditionBlock) {
    this.eventName = eventName;
    this.conditionBlock = conditionBlock || function(){return true};
}

DomEventDefinition.normalize = function(domEventDefinition) {
    if (typeof domEventDefinition === 'string')
        domEventDefinition = new DomEventDefinition(domEventDefinition, null);
    return domEventDefinition;    
};

function DomEventContext(stateSystem, limitState, selector, domEventDefinition) {
	this.stateSystem = stateSystem;
	this.limitState = limitState;
	this.selector = selector;
	this.domEventDefinition = domEventDefinition;
}

DomEventContext.prototype = {
	Goto: function(stateName) {
        var stateSystem = this.stateSystem;
        this.Do(function(){
                stateSystem.Goto(stateName);
        });
	},

    Do: function(block) {
        var stateSystem = this.stateSystem;
        var limitState = this.limitState;
        var domEventDefinition = this.domEventDefinition;

        $(this.selector).bind(domEventDefinition.eventName, function(domEvent) {
            if (limitState == null || stateSystem.IsIn(limitState.name)) {
                if (!domEventDefinition.conditionBlock(domEvent))
                    return;

                block();
                domEvent.stopImmediatePropagation(); // stop other event handlers
            }
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

function SpecificStateContext(stateSystem, state) {
	this.stateSystem = stateSystem;
	this.state = state;	
}

SpecificStateContext.prototype = {
	Find: function(selector) {
		return new SpecificStateElementContext(this.stateSystem, this.state, selector);		
	},
	
	After: function(milliseconds) {
		return new TimeContext(this.stateSystem, this.state, milliseconds);
	}
};

function SpecificStateElementContext(stateSystem, state, selector) {
	this.stateSystem = stateSystem;
	this.state = state;
	this.selector = selector;
}

SpecificStateElementContext.prototype = {
	On: function(domEventDefinition) {
        domEventDefinition = DomEventDefinition.normalize(domEventDefinition);
		return new DomEventContext(this.stateSystem, this.state, this.selector, domEventDefinition);
	}
};

function TimeContext(stateSystem, state, milliseconds) {
	this.stateSystem = stateSystem;
	this.state = state;
	this.milliseconds = milliseconds;	
}

TimeContext.prototype = {
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


var KeyUp = {
    Escape: new DomEventDefinition('keyup', function(ev) { return ev.keyCode === 27 }),
    Up: new DomEventDefinition('keyup', function(ev) { return ev.keyCode === 38 }),
    Down: new DomEventDefinition('keyup', function(ev) { return ev.keyCode === 40 }),
    Left: new DomEventDefinition('keyup', function(ev) { return ev.keyCode === 37 }),
    Right: new DomEventDefinition('keyup', function(ev) { return ev.keyCode === 39 })
};