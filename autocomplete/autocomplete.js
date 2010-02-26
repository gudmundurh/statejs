function getCompletions(text) {
    var suffixes = ["hundur", " fiðla", "píanó", "leikjatölva"];
    return _.map(suffixes, function(suffix) {
        return text + suffix
    });
}

$(document).ready(function() {
    var system = new StateSystem('input');
    system.DefineStates('blurred', 'focused', 'typing', 'autocomplete');

    system.In('blurred').On('focus').Goto('focused');
    system.InAny().On('blur').Goto('blurred');

    system.In('focused').On(KeyDown).Goto('typing');

    system.In('typing').On(KeyDown).Goto('typing');
    system.In('typing').After(1000).Goto('autocomplete');

    system.In('autocomplete').On(KeyDown.Escape).Goto('focused');
    system.In('autocomplete').On(KeyDown.Up).Do(moveSelectionUp);
    system.In('autocomplete').On(KeyDown.Down).Do(moveSelectionDown);
    system.In('autocomplete').On(KeyDown.Enter).Do(setSelection);
    system.In('autocomplete').On(KeyDown).Goto('autocomplete');

    system.Enter('autocomplete').Do(showCompletions);
    system.Leave('autocomplete').Do(hideCompletions);

    system.Goto('blur');

    _.each(system.states, function(state) {
        system.Enter(state.name).Do(_.bind(console.log, console, 'Entered ' + state.name));
    });

    function showCompletions() {
        var completions = getCompletions($(this).val());
        var ul = $(this).parent().find('ul').empty();
        _.each(completions, function(completion) {
            ul.append('<li>' + completion + '</li>');
        });
        ul.find('li:first').addClass('selected');
        ul.show();
    }

    function setSelection() {
        var ul = $(this).parent().find('ul');
        $(this).val(ul.find('.selected').text());
        system.Goto('focus');
    }

    function hideCompletions() {
        var ul = $(this).parent().find('ul');
        ul.hide();
    }

    function moveSelectionUp() {
        moveSelection.call(this, 'prev');
    }

    function moveSelectionDown() {
        moveSelection.call(this, 'next');
    }

    function moveSelection(method) {
        var ul = $(this).parent().find('ul');

        var oldSelection = ul.find('.selected');
        var newSelection = oldSelection[method]();

        if (newSelection.length == 0)
            return;

        oldSelection.removeClass('selected');
        newSelection.addClass('selected');
    }
});

/* Additions:

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