import { Dispatch } from "react";
import { APIClient } from "@/util/server/APIClient";
import { AppUser, AuthBody, AuthResponse, DispatchAction } from "@/types";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

export interface UserState extends AppUser {
  fetching: boolean;
  error: any;
}

export const initialState: UserState = {
  username: "",
  email: "",
  message: "",
  fetching: false,
  error: undefined,
};

export const userReducer = (
  state: UserState,
  { type, payload }: DispatchAction<any>,
) => {
  switch (type) {
    case AUTH_FETCHING:
      return { ...state, fetching: payload };
    case AUTH_REJECTED:
      return { ...state, error: payload };
    case AUTH_RESOLVED:
      return { ...state, ...payload };
    case LOGOUT:
      return initialState;
    default:
      return state;
  }
};

export const AUTH_FETCHING = "@fetching/auth";
export const AUTH_REJECTED = "@rejected/auth";
export const AUTH_RESOLVED = "@resolved/auth";
export const LOGOUT = "logout";

export const tokenRefresh = async (dispatch: Dispatch<DispatchAction<any>>) => {
  dispatch({ type: AUTH_FETCHING, payload: true });
  try {
    const userInfo = await APIClient.tokenRefresh();

    dispatch({ type: AUTH_RESOLVED, payload: userInfo });
  } catch (error) {
    dispatch({ type: AUTH_REJECTED, payload: error });
  } finally {
    dispatch({ type: AUTH_FETCHING, payload: false });
  }
};

export const login =
  ({ baseUrl, ...body }: AuthBody) =>
  async (dispatch: Dispatch<DispatchAction<any>>) => {
    dispatch({ type: AUTH_FETCHING, payload: true });
    SecureStore.setItemAsync("usernameOrEmail", body.usernameOrEmail);
    SecureStore.setItemAsync("baseUrl", baseUrl);
    SecureStore.setItemAsync("apiKey", body.apiKey);
    APIClient.setBaseUrl(baseUrl);
    try {
      const {
        tokenType,
        refreshToken,
        accessToken,
        ...userInfo
      }: AuthResponse = await APIClient.POST("ebtsixm/auth/signin", body);

      SecureStore.setItemAsync("tokenType", tokenType);
      SecureStore.setItemAsync("refreshToken", refreshToken);
      SecureStore.setItemAsync("accessToken", accessToken);

      dispatch({ type: AUTH_RESOLVED, payload: userInfo });

      router.canGoBack() && router.back();
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(
          "Rejected",
          `Unable to connect to service: ${error.message}`,
        );
      }
      dispatch({ type: AUTH_REJECTED, payload: error });
    } finally {
      dispatch({ type: AUTH_FETCHING, payload: false });
    }
  };

export const logout = (dispatch: Dispatch<{ type: string }>) => {
  SecureStore.deleteItemAsync("tokenType");
  SecureStore.deleteItemAsync("refreshToken");
  SecureStore.deleteItemAsync("accessToken");
  dispatch({ type: LOGOUT });
};
