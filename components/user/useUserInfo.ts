import { useContext } from "react";
import { UserStateContext } from "./UserProvider";

export const useUserInfo = () => {
  const user = useContext(UserStateContext);

  return user;
};
