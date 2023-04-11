/**
 * WordPress dependencies
 */
const {
  NavigatorProvider: __stableNavigatorProvider,
  __experimentalNavigatorProvider,
  NavigatorScreen: __stableNavigatorScreen,
  __experimentalNavigatorScreen,
  NavigatorButton: __stableNavigatorButton,
  __experimentalNavigatorButton,
  NavigatorToParentButton: __stableNavigatorToParentButton,
  __experimentalNavigatorToParentButton,
} = wp.components;

const NavigatorProvider = __stableNavigatorProvider || __experimentalNavigatorProvider;
const NavigatorScreen = __stableNavigatorScreen || __experimentalNavigatorScreen;
const NavigatorButton = __stableNavigatorButton || __experimentalNavigatorButton;
const NavigatorToParentButton =
  __stableNavigatorToParentButton || __experimentalNavigatorToParentButton;

/**
 * Component Class
 */
export default function NavigatorControl(props) {
  const { children, options } = props;

  return (
    <NavigatorProvider initialPath="/" className="vpf-component-navigator-control">
      <NavigatorScreen path="/" className="vpf-component-navigator-control-toggles">
        {options.map((option) => {
          return (
            <NavigatorButton key={option.category} path={`/${option.category}`}>
              <span>{option.title}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z" />
              </svg>
            </NavigatorButton>
          );
        })}
      </NavigatorScreen>

      {options.map((option) => {
        return (
          <NavigatorScreen key={option.category} path={`/${option.category}`}>
            <div className="vpf-component-navigator-control-screen-title">
              <NavigatorToParentButton>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M14.6 7l-1.2-1L8 12l5.4 6 1.2-1-4.6-5z" />
                </svg>
              </NavigatorToParentButton>
              <span>{option.title}</span>
            </div>
            {children(option)}
          </NavigatorScreen>
        );
      })}
    </NavigatorProvider>
  );
}
