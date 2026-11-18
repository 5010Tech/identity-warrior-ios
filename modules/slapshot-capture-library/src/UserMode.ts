/**
 * Whether the given captures are displayed for someone collecting their own prints or someone else's
 * @property SelfCapture collecting one's own prints
 * @property AdministeredCapture collecting someone else's prints
 */
enum UserMode {
    SelfCapture = "SelfCapture",
    AdministeredCapture = "AdministeredCapture"
}

export default UserMode