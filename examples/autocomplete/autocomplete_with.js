/* Shows how the with-statement can be used to make the declarations more readable */



$(document).ready(function() {
    var system = new StateSystem('input');

    // When using the "with" approach, In should perhaps be replaced/aliased with State.
    // That would give more natural syntax, i.e. with (State("a") { ... }
    with (system) {
        DefineStates('blurred', 'focused', 'typing', 'autocomplete');

        In('blurred').On('focus').Goto('focused');
        InAny().On('blur').Goto('blurred');

        InAny().On('dblclick').Goto('autocomplete');

        In('focused').On(KeyDown).Goto('typing');

        with (In('typing')) {
            On(KeyDown).Goto('typing');
            After(1000).Goto('autocomplete');
        }

        with (In('autocomplete')) {
            On(KeyDown.Escape).Goto('focused');
            On(KeyDown.Up).Do(moveSelectionUp);
            On(KeyDown.Down).Do(moveSelectionDown);
            On(KeyDown.Enter).Do(setSelection); // .and.Goto('focused');
            On(KeyDown).Goto('autocomplete');
        }

        Enter('autocomplete').Do(showCompletions);
        Leave('autocomplete').Do(hideCompletions);

        Goto('blurred');

        SetupDebug();
    }

    function showCompletions() {
        var completions = getCompletions($(this).val());
        var ul = $(this).parent().find('ul');
        ul.empty();
        _.each(completions, function(completion) {
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

function getCompletions(text) {
    var suffixes = ["hundur", " fiðla", "píanó", "leikjatölva"];
    return _.map(suffixes, function(suffix) {
        return text + suffix
    });
}