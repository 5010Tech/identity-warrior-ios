import { useContext } from "react";
import { UserActionContext } from "./UserProvider";

export const useUserActions = () => {
  const dispatch = useContext(UserActionContext);
  return dispatch;
};
