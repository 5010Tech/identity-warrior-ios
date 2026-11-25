import {
  Dispatch,
  FC,
  PropsWithChildren,
  createContext,
  useEffect,
  useReducer,
} from "react";
import {
  initialState,
  tokenRefresh,
  userReducer,
  UserState,
} from "./userReducer";
import { noOp } from "@/util/noOp";
import { DispatchAction } from "@/types";
import { getSavedCollectionMode } from "@/util/collectionMode";

export const UserStateContext = createContext<UserState>(initialState);
export const UserActionContext =
  createContext<Dispatch<DispatchAction<any>>>(noOp);

export const UserProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);
  useEffect(() => {
    // The IXM sign-in only applies to DHS collections. In DoD mode the app
    // doesn't contact the IXM server at start-up, so there is no sign-in error.
    getSavedCollectionMode().then((mode) => {
      if (mode === "DHS") tokenRefresh(dispatch);
    });
  }, []);

  return (
    <UserStateContext.Provider value={state}>
      <UserActionContext.Provider value={dispatch}>
        {children}
      </UserActionContext.Provider>
    </UserStateContext.Provider>
  );
};
