// @flow
import autobind from "autobind-decorator";
import * as _ from "lodash";
import * as React from "react";
import {Image as RNImage, Animated, StyleSheet, View, Platform} from "react-native";
import {BlurView} from "expo";
import {type StyleObj} from "react-native/Libraries/StyleSheet/StyleSheetTypes";

import CacheManager from "./CacheManager";

type ImageProps = {
    style?: StyleObj,
    preview?: string,
    uri: string
};

type ImageState = {
    uri: string,
    intensity: Animated.Value
};

export default class Image extends React.Component<ImageProps, ImageState> {

    style: StyleObj;
    subscribedToCache = true;

    load(props: ImageProps) {
        const {uri, style, skipQueryForCaching} = props;
        this.style = [
            StyleSheet.absoluteFill,
            { width: "100%", height: "100%" },
            _.transform(
                _.pickBy(StyleSheet.flatten(style), (value, key) => propsToCopy.indexOf(key) !== -1),
                (result, value, key) => {
                    result[key] = value - style.borderWidth
                }
            )
        ];
        uri && CacheManager.cache(uri, this.setURI, skipQueryForCaching);
    }

    componentWillMount() {
        const intensity = new Animated.Value(100);
        this.setState({ intensity });
        this.load(this.props);
    }

    componentWillReceiveProps(props: ImageProps) {
        this.load(props);
    }

    @autobind
    setURI(uri: string) {
        if (this.subscribedToCache) {
            this.setState({ uri });
        }
    }

    componentDidUpdate(prevProps: ImageProps, prevState: ImageState) {
        const {preview} = this.props;
        const {uri, intensity} = this.state;
        if (uri && preview && uri !== preview && prevState.uri === undefined) {
            Animated.timing(intensity, { duration: 300, toValue: 0, useNativeDriver: true }).start();
        }
    }

    componentWillUnmount() {
        this.subscribedToCache = false;
    }

    render(): React.Node {
        const {style: computedStyle} = this;
        const {requireHook, preview, style} = this.props;
        const {uri, intensity} = this.state;
        const hasRequireHook = !!requireHook
        const hasPreview = !!preview;
        const opacity = intensity.interpolate({
            inputRange: [0, 100],
            outputRange: [0, 0.5]
        });
        return (
            <View {...{style}}>
                {
                    (hasRequireHook && preview === undefined && uri === undefined) && (
                        <RNImage
                            source={requireHook}
                            resizeMode="cover"
                            style={computedStyle}
                        />
                    )
                }
                {
                    hasPreview && (
                        <RNImage
                            source={{ uri: preview }}
                            resizeMode="cover"
                            style={computedStyle}
                        />
                    )
                }
                {
                    (uri && uri !== preview) && (
                        <RNImage
                            source={{ uri }}
                            resizeMode="cover"
                            style={computedStyle}
                        />
                    )
                }
                {
                    hasPreview && Platform.OS === "ios" && (
                        <AnimatedBlurView tint="dark" style={computedStyle} {...{intensity}} />
                    )
                }
                {
                    hasPreview && Platform.OS === "android" && (
                        <Animated.View style={[computedStyle, { backgroundColor: "black", opacity }]} />
                    )
                }
            </View>
        );
    }
}

const propsToCopy = [
    "borderRadius", "borderBottomLeftRadius", "borderBottomRightRadius", "borderTopLeftRadius", "borderTopRightRadius"
];

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
