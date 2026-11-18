package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary;

import android.graphics.Color;
import android.util.Log;
import android.view.Choreographer;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;

import java.util.Map;

import kotlin.random.Random;

public class SlapshotCaptureViewManager extends ViewGroupManager<FrameLayout> {

    public static final String REACT_NAME = "SlapshotCaptureView";
    public final int COMMAND_CREATE = 1;

    @NonNull
    @Override
    public String getName() {
        return REACT_NAME;
    }

    @NonNull
    @Override
    protected FrameLayout createViewInstance(@NonNull ThemedReactContext themedReactContext) {
        Log.d("SCIO", "creating view instance");
        FrameLayout frameLayout = new FrameLayout(themedReactContext);
        frameLayout.setLayoutParams(new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        return frameLayout;
    }

    @Nullable
    @Override
    public Map<String, Integer> getCommandsMap() {
        return MapBuilder.of("create", COMMAND_CREATE);
    }

    @Override
    public void receiveCommand(
            @NonNull FrameLayout root,
            String commandId,
            @Nullable ReadableArray args
    ) {
        super.receiveCommand(root, commandId, args);
        Log.d("Scio", "received command " + commandId);
        int reactNativeViewId = args.getInt(0);
        int commandIdInt = Integer.parseInt(commandId);

        switch (commandIdInt) {
            case COMMAND_CREATE:
                View view = root.findViewById(reactNativeViewId);
                Log.d("Scio", "running setupLayoutHack on view " + reactNativeViewId);
                setupLayoutHack(view);
                break;
            default: {}
        }
    }

    private void setupLayoutHack(View view){
        final int id = Random.Default.nextInt();
        Choreographer.getInstance().postFrameCallback(new Choreographer.FrameCallback() {
            @Override
            public void doFrame(long l) {
                ViewGroup parent = (ViewGroup)view.getParent();
                if (parent != null) {
                    manuallyLayoutChildren(parent, id);
                    parent.getViewTreeObserver().dispatchOnGlobalLayout();
                    Choreographer.getInstance().postFrameCallback(this);
                }
            }
        });
    }

    private void manuallyLayoutChildren(ViewGroup view, int id){
        int viewW = view.getMeasuredWidth();
        int viewH = view.getMeasuredHeight();

        for (int i = 0; i < view.getChildCount(); i++){
            View child = view.getChildAt(i);

            child.measure(
                    View.MeasureSpec.makeMeasureSpec(viewW, View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(viewH, View.MeasureSpec.EXACTLY)
            );

            child.layout(0, 0, child.getMeasuredWidth(), child.getMeasuredHeight());
        }
    }
}
