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

export const UserStateContext = createContext<UserState>(initialState);
export const UserActionContext =
  createContext<Dispatch<DispatchAction<any>>>(noOp);

export const UserProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);
  useEffect(() => {
    tokenRefresh(dispatch);
  }, []);

  return (
    <UserStateContext.Provider value={state}>
      <UserActionContext.Provider value={dispatch}>
        {children}
      </UserActionContext.Provider>
    </UserStateContext.Provider>
  );
};
