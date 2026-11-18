import { AuthResponse } from "@/types";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import { tHelper } from "@/translations/translationHelper";

export class APIClient {
  // Base URL from environment variable
  static #baseUrl = process.env.EXPO_PUBLIC_BASE_URL || "";

  // A function to retry the last fetch call
  static #retryFn: () => Promise<Response>;

  /**
   * Asynchronously initializes the APIClient by loading the base URL from SecureStore.
   * Call this during app startup before making any API calls.
   */
  public static async init(): Promise<void> {
    try {
      const storedBaseUrl = await SecureStore.getItemAsync("baseUrl");
      if (storedBaseUrl) {
        this.setBaseUrl(storedBaseUrl);
        console.log("APIClient baseUrl set from SecureStore:", storedBaseUrl);
      } else {
        console.log("No stored baseUrl found, using default:", this.#baseUrl);
      }
    } catch (error) {
      console.error("Error loading baseUrl from SecureStore:", error);
    }
  }

  public static get baseUrl(): string {
    return this.#baseUrl;
  }

  /**
   * Public method to update the base URL.
   * @param url - The new base URL as a string.
   */
  static setBaseUrl(url: string): void {
    this.#baseUrl = url;
  }

  /**
   * Makes a GET request.
   */
  static async GET(
    endpoint: string,
    { ignoreRetry, ...options }: { [key: string]: any } = {},
  ) {
    try {
      const res = await this.#fetch(
        this.#getUrl(endpoint),
        {
          method: "GET",
          headers: await this.#headers(),
          ...options,
        },
        ignoreRetry,
      );
      return await this.#handleResponse(res);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  /**
   * Makes a POST request.
   */
  static async POST<T>(
    endpoint: string,
    body: T,
    { ignoreRetry, ...options }: { [key: string]: any } = {},
  ): Promise<any> {
    try {
      const res = await this.#fetch(
        this.#getUrl(endpoint),
        {
          method: "POST",
          headers: await this.#headers(),
          body: JSON.stringify(body),
          ...options,
        },
        ignoreRetry,
      );
      return await this.#handleResponse(res);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  /**
   * Refreshes the access token using the stored refresh token.
   */
  static async tokenRefresh() {
    try {
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      if (!refreshToken) {
        throw Error("No refresh token available");
      }

      const response = await this.POST(
        "ebtsixm/auth/refreshtoken",
        { refreshToken },
        { ignoreRetry: true },
      );

      const {
        accessToken,
        refreshToken: newRefreshToken,
        tokenType,
        ...userInfo
      } = response;

      if (!accessToken) {
        throw new Error("Could not retrieve access token.");
      }

      await SecureStore.setItemAsync("accessToken", accessToken);
      await SecureStore.setItemAsync("refreshToken", newRefreshToken);
      await SecureStore.setItemAsync("tokenType", tokenType);

      return userInfo;
    } catch (error) {
      console.error(error);
      try {
        await this.#loginWithStoredCredentials();
      } catch (error) {
        console.error(error);
        await SecureStore.setItemAsync("accessToken", "");
        await SecureStore.setItemAsync("refreshToken", "");
        await SecureStore.setItemAsync("tokenType", "");
        this.#authFailedAlert();
      }
    }
  }

  // PRIVATE METHODS

  /**
   * Constructs a URL for the given endpoint.
   */
  static #getUrl(endpoint: string): URL {
    return new URL(`ebtsixm/api/${endpoint}`, this.#baseUrl);
  }

  /**
   * Creates headers for requests.
   */
  static async #headers(): Promise<Headers> {
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const tokenType = await SecureStore.getItemAsync("tokenType");
    return new Headers({
      "Content-Type": "application/json",
      Accept: "application/json",
      authorization: `${tokenType} ${accessToken}`,
    });
  }

  /**
   * A wrapper around fetch that supports retry logic.
   */
  static #fetch(
    url: URL,
    init: RequestInit = {},
    ignoreRetry: boolean = false,
  ): Promise<Response> {
    if (!ignoreRetry) {
      this.#retryFn = async () => {
        return fetch(url, { ...init, headers: await this.#headers() });
      };
    }

    console.log(
      JSON.stringify(
        { url, init },
        (key, value) =>
          typeof value === "string" ? value.slice(0, 255) : value,
        2,
      ),
    );

    return fetch(url, init);
  }

  /**
   * Handles the fetch response, including token refresh logic.
   */
  static async #handleResponse(res: Response): Promise<any> {
    if (res.ok) {
      const json = await res.json();
      console.log(
        JSON.stringify(
          json,
          (key, value) =>
            typeof value === "string" ? value.slice(0, 255) : value,
          2,
        ),
      );
      return json;
    }

    if (res.status === 401) {
      if (res.url.endsWith("auth/signin")) {
        this.#throw(res);
      }
      if (res.url.endsWith("auth/refreshtoken")) {
        this.#authFailedAlert();
        this.#throw(res);
      }
      await this.tokenRefresh();
      return await this.#handleResponse(await this.#retryFn());
    }

    this.#throw(res);
  }

  /**
   * Throws an error with the response details.
   */
  static #throw(res: Response): never {
    const error = new Error(`${res.url} ERROR: ${res.status}`);
    // Attach the response to the error's cause (non-standard, but helpful for debugging)
    (error as any).cause = res;
    throw error;
  }

  /**
   * Uses credentials stored in secure storage to retrieve a new jwt after refresh token expires
   */
  static async #loginWithStoredCredentials(): Promise<void> {
    const usernameOrEmail = await SecureStore.getItemAsync("usernameOrEmail");
    const apiKey = await SecureStore.getItemAsync("apiKey");

    if (!apiKey || !usernameOrEmail) {
      throw Error("Could not log in: No user credentials stored");
    }
    const { tokenType, refreshToken, accessToken }: AuthResponse =
      await APIClient.POST(
        "ebtsixm/auth/signin",
        {
          usernameOrEmail,
          apiKey,
        },
        { ignoreRetry: true },
      );

    SecureStore.setItemAsync("tokenType", tokenType);
    SecureStore.setItemAsync("refreshToken", refreshToken);
    SecureStore.setItemAsync("accessToken", accessToken);
  }

  static #authFailedAlert(): void {
    Alert.alert(
      tHelper("authError"),
      tHelper("authErrorDesc"),
      [
        {
          text: tHelper("reviewSettings"),
          onPress: () => router.navigate("/apiSettings"),
        },
        { text: tHelper("cancel"), style: "cancel" },
      ],
      { cancelable: true },
    );
  }
}
