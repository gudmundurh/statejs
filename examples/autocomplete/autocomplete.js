
$(document).ready(function() {
    var system = new StateSystem('input');
    system.DefineStates('blurred', 'focused', 'typing', 'autocomplete');

    system.In('blurred').On('focus').Goto('focused');
    system.InAny().On('blur').Goto('blurred');

    system.InAny().On('dblclick').Goto('autocomplete');

    system.In('focused').On(KeyDown).Goto('typing');

    system.In('typing').On(KeyDown).Goto('typing');
    system.In('typing').After(1000).Goto('autocomplete');

    system.In('autocomplete').On(KeyDown.Escape).Goto('focused');
    system.In('autocomplete').On(KeyDown.Up).Do(moveSelectionUp);
    system.In('autocomplete').On(KeyDown.Down).Do(moveSelectionDown);
    system.In('autocomplete').On(KeyDown.Enter).Do(setSelection); // .and.Goto('focused');
    system.In('autocomplete').On(KeyDown).Goto('autocomplete');

    system.Enter('autocomplete').Do(showCompletions);
    system.Leave('autocomplete').Do(hideCompletions);

    system.Goto('blurred');

    system.SetupDebug();    


    function showCompletions() {
        var completions = getCompletions($(this).val());
        var ul = $(this).parent().find('ul');
        ul.empty();
        $.each(completions, function(i, completion) {
            ul.append('<li>' + completion + '</li>');
        });
        ul.find('li:first').addClass('selected');
        ul.show();
    }

    function setSelection() {
        var ul = $(this).parent().find('ul');
        $(this).val(ul.find('.selected').text());
        system.Goto('focused');
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

Important:
To keep the state-logic in one place, all state-changing actions (Goto/Cycle) should
 be set up with the system, but not invoked directly on the system, like is currently
 done within custom Do functions

IDEAS
Parametrized states: Would be ideal to extend the state system to all possible states, not
 just abstract ones. autocomplete(i) would then indicate that autocompletion is visible,
 with option i selected.

 Could help in many different scenarios, like for accordian controls, menus etc.

 In('autocomplete(i<last)').On(KeyDown.Down).Goto('autocomplete(i+1)')
 In('autocomplete(i>first)').On(KeyDown.Up).Goto('autocomplete(i-1)')
 Enter('autocomplete(i)').Do(function(i){ setSelection(i) });

 */

function getCompletions(text) {
    var suffixes = ["hundur", " fiðla", "píanó", "leikjatölva"];
    return $.map(suffixes, function(suffix) {
        return text + suffix
    });
}
