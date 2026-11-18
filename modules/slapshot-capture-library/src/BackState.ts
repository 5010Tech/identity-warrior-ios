/**
 * Represents how the SDK handled a back pressed event
 * @property NotHandled SDK did not handle the event. Should be handled by host
 * @property HandledTransitionedBackToCaller SDK handled the event and is no longer in control of the supplied view. The event should not be continued to be propagated.
 * @property Handled SDK handle the event. The event should not be continued to be propagated.
 */
enum BackState {
    NotHandled = 'NotHandled',
    HandledTransitionedBackToCaller = 'HandledTransitionedBackToCaller',
    Handled = 'Handled'
}

export default BackState