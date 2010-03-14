function assertThrows(block) {
    var thrown = false;
    try {
        block();
    }
    catch (e) {
        thrown = true;
    }
    ok(thrown, "exception thrown");
}

module("StateSystem");

test("Goto / Given state name / Moves system to the given state", function() {
    var system = new StateSystem();
    system.DefineStates('a');

    system.Goto('a');

    ok(system.IsIn('a'));
});

test("Goto / Given invalid state name / Throws", function() {
    var system = new StateSystem();

    assertThrows(function() {
        system.Goto('a');
    });
});

test("DefineStates / Defining state named 'start' / Throws", function() {
    var system = new StateSystem();

    assertThrows(function() {
        system.DefineStates('start');
    });
});

test("Cycle / When called with two states / Cycles between the states", function() {
    var system = new StateSystem();
    system.DefineStates('a', 'b');

    system.Cycle('a', 'b');
    ok(system.IsIn('a'));

    system.Cycle('a', 'b');
    ok(system.IsIn('b'));

    system.Cycle('a', 'b');
    ok(system.IsIn('a'));
});

test("Enter / When state with enter-callback is defined and state is entered / Callback is called", function(){
    var system = new StateSystem();
    system.DefineStates('a');
    var called = false;
    system.Enter('a').Do(function(){ called = true });

    system.Goto('a');

    ok(called, "callback called");
});

test("Leave / When state with leave-callback is defined and state is leaved / Callback is called", function(){
    var system = new StateSystem();
    system.DefineStates('a', 'b');
    var called = false;
    system.Leave('a').Do(function(){ called = true });
    system.Goto('a');

    ok(!called, "callback not called before leaving");
    system.Goto('b');
    ok(called, "callback called on leave");
});

test("Enter / When re-entering state / Enter callback is called", function(){
    var system = new StateSystem();
    system.DefineStates('a');
    var callCount = 0;
    system.Enter('a').Do(function(){ callCount++ });

    system.Goto('a');
    system.Goto('a')

    equal(callCount, 2, "callCount");
});

test("On-->Do / When event is triggered / Callback is called", function(){
    var button = $('<input type="button" id="testButton">').appendTo('body');
    var called = false;
    var system = new StateSystem('#testButton');

    system.DefineStates('waiting', 'clicked');
    system.In('waiting').On('click').Do(function(){ called = true });
    system.Goto('waiting');

    // Act
    button.trigger('click');

    // Assert
    ok(called, "Callback called");

    // Cleanup
    button.remove();
});

test("On-->Goto / When event is triggered / New state is entered", function(){
    var button = $('<input type="button" id="testButton">').appendTo('body');
    var system = new StateSystem('#testButton');

    system.DefineStates('waiting', 'clicked');
    system.In('waiting').On('click').Goto('clicked');
    system.Goto('waiting');

    // Act
    button.trigger('click');

    // Assert
    ok(system.IsIn('clicked'), "In state clicked");

    // Cleanup
    button.remove();
});