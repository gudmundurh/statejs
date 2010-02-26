function getCompletions(text) {
    var suffixes = ["hundur", " fiðla", "píanó", "leikjatölva"];
    return _.map(suffixes, function(suffix) {
        return text + suffix
    });
}

$(document).ready(function() {
    var system = new StateSystem();
    system.DefineStates('blur', 'focus', 'typing', 'autocomplete');

    system.In('blur').Find('input').On('focus').Goto('focus');
    system.Enter('blur').Do(function() {
        $('input').blur();
    });

    system.In('focus').Find('input').On('keypress').Goto('typing');
    system.In('focus').Find('input').On('blur').Goto('blur');

    system.In('typing').Find('input').On('keypress').Goto('typing');
    system.In('typing').After(1000).Goto('autocomplete');
    system.In('typing').Find('input').On('blur').Goto('blur');

    system.In('autocomplete').Find('input').On('blur').Goto('blur');
    system.In('autocomplete').Find('input').On('blur').Goto('blur');
    system.In('autocomplete').Find('input').On(KeyUp.Escape).Goto('typing');
    system.In('autocomplete').Find('input').On(KeyUp.Up).Do(function() { moveSelection(-1) });
    system.In('autocomplete').Find('input').On(KeyUp.Down).Do(function() { moveSelection(+1) });
    system.In('autocomplete').Find('input').On('keyup').Goto('autocomplete');

    system.Enter('autocomplete').Do(showCompletions);
    system.Leave('autocomplete').Do(hideCompletions);

    system.Goto('blur');

    _.each(_.rest(system.states), function(state) {
        system.Enter(state.name).Do(_.bind(console.log, console, 'Entered ' + state.name));
    });

    function showCompletions() {
        var completions = getCompletions($('input').val());
        var ul = $('.autocomplete-wrapper ul').empty();
        _.each(completions, function(completion) {
            ul.append('<li>' + completion + '</li>');
        });
        ul.find('li:first').addClass('selected');
        ul.show();
    }
    
    function hideCompletions() {
        $('.autocomplete-wrapper ul').hide();
    }

    function moveSelection(direction) {
        var ul = $('.autocomplete-wrapper ul');
        var method = direction > 0 ? 'next' : 'prev';

        var oldSelection = ul.find('.selected');
        var newSelection = oldSelection[method]();

        if (newSelection.length == 0)
            return;

        oldSelection.removeClass('selected');
        newSelection.addClass('selected');
    }
});

/* Additions:

 Define events for all states, eins og t.d. fyrir blur hér að ofan
 Give the system context, and:
 Make .On() work in global context, i.e. system.In('state').On('focus')...

 Add event conditions to .On(), as in .On(keypress, function(ev){ return ev.keyCode == 27 })
 and then define KeyPress.Escape = function(ev){ return ev.keyCode==27 }),
 so we can do:
 .On('keypress', KeyPress.Escape)
 and then eventually
 .On(KeyPress.Escape)

 VERY NICE TO HAVE:
 Draw graph of the state system :D

Auto-states corresponding to DOM events, e.g. focus/blur

 */


/*

 in blur:
 on focus -> goto focus

 in focus:
 on change -> goto typing

 in typing:
 on change -> goto typing
 after 500 msec -> autocomplete

 in autocomplete:
 on change -> goto autocomplete
 on enter -> set text to selected text; goto typing
 on up/down -> change selection; goto??
 on blur -> goto blur

 */