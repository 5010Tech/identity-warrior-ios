import React, { useEffect, useState } from 'react'
import { UIManager, View, StyleSheet, findNodeHandle, requireNativeComponent, Platform, ViewStyle } from 'react-native'

export type SlapshotCaptureProps = {
  readyCallback: (viewId: number) => void
}

export type SlapshotCaptureNativeProps = {
  style: ViewStyle
}

const SlapshotCaptureNativeView = requireNativeComponent<SlapshotCaptureNativeProps>('SlapshotCaptureView')


/**
 * This represents the view that will host all Slapshot Capture SDK routines that are presented to the user. This takes
 * care of determining and returning (via SlapshotCaptureProps.readyCallback) what the viewId is required for the native Android views
 * require to present their fragments and when it is ready. This in conjunction with SlapshotCaptureEngine are the entry points
 * for the Slapshot React Native Capture SDK.
 * @param props
 * @returns 
 */
const SlapshotCaptureView = (props: SlapshotCaptureProps) => {
    const [nativeComponentRef, setNativeComponentRef] = useState<React.Component<unknown, {}, any>>();

    useEffect(() => {
      if (nativeComponentRef) {
        let viewIdOrNull = findNodeHandle(nativeComponentRef);

        // no equivalent is necessary for iOS.
        if (Platform.OS === 'android') {
          UIManager.dispatchViewManagerCommand(
            viewIdOrNull,
            // we are calling the 'create' command
            '1',
            [viewIdOrNull],
          );
        }

        if (viewIdOrNull) props.readyCallback(viewIdOrNull);
      }
    }, [nativeComponentRef]);

    return (
        <SlapshotCaptureNativeView 
          style={{ flex: 1 }}
          ref={nativeRef => {
            if (nativeRef != null) setNativeComponentRef(nativeRef);
          }} 
        />
    );
}

export default SlapshotCaptureView