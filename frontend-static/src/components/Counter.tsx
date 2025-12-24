import { motion, useSpring, useTransform, MotionValue } from 'motion/react';
import React, { useEffect } from 'react';

import './Counter.css';

interface NumberProps {
    mv: MotionValue<number>;
    number: number;
    height: number;
}

function Number({ mv, number, height }: NumberProps) {
    let y = useTransform(mv, (latest: number) => {
        let placeValue = latest % 10;
        let offset = (10 + number - placeValue) % 10;
        let memo = offset * height;
        if (offset > 5) {
            memo -= 10 * height;
        }
        return memo;
    });
    return (
        <motion.span className="counter-number" style={{ y }}>
            {number}
        </motion.span>
    );
}

interface DigitProps {
    place: number;
    value: number;
    height: number;
    digitStyle?: React.CSSProperties;
}

function Digit({ place, value, height, digitStyle }: DigitProps) {
    let valueRoundedToPlace = Math.floor(value / place);
    let animatedValue = useSpring(valueRoundedToPlace);
    useEffect(() => {
        animatedValue.set(valueRoundedToPlace);
    }, [animatedValue, valueRoundedToPlace]);
    return (
        <div className="counter-digit" style={{ height, ...digitStyle }}>
            {Array.from({ length: 10 }, (_, i) => (
                <Number key={i} mv={animatedValue} number={i} height={height} />
            ))}
        </div>
    );
}

interface CounterProps {
    value: number;
    fontSize?: number;
    padding?: number;
    places?: number[];
    gap?: number;
    borderRadius?: number;
    horizontalPadding?: number;
    textColor?: string;
    fontWeight?: string | number;
    containerStyle?: React.CSSProperties;
    counterStyle?: React.CSSProperties;
    digitStyle?: React.CSSProperties;
    gradientHeight?: number;
    gradientFrom?: string;
    gradientTo?: string;
    topGradientStyle?: React.CSSProperties;
    bottomGradientStyle?: React.CSSProperties;
}

export default function Counter({
    value,
    fontSize = 100,
    padding = 0,
    places = [100, 10, 1],
    gap = 0,
    borderRadius = 4,
    horizontalPadding = 1,
    textColor = 'white',
    fontWeight = 'bold',
    containerStyle,
    counterStyle,
    digitStyle,
    gradientHeight = 16,
    gradientFrom = 'black',
    gradientTo = 'transparent',
    topGradientStyle,
    bottomGradientStyle
}: CounterProps) {
    const height = fontSize + padding;
    const defaultCounterStyle: React.CSSProperties = {
        fontSize,
        gap: gap,
        borderRadius: borderRadius,
        paddingLeft: horizontalPadding,
        paddingRight: horizontalPadding,
        color: textColor,
        fontWeight: fontWeight as any
    };
    const defaultTopGradientStyle: React.CSSProperties = {
        height: gradientHeight,
        background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`
    };
    const defaultBottomGradientStyle: React.CSSProperties = {
        height: gradientHeight,
        background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`
    };
    const visiblePlaces = places.filter(place => place <= 1 || value >= place);

    return (
        <div className="counter-container" style={containerStyle}>
            <div className="counter-counter" style={{ ...defaultCounterStyle, ...counterStyle }}>
                {visiblePlaces.map((place, index) => {
                    const isDecimal = place < 1 && (index > 0 && visiblePlaces[index - 1] >= 1);
                    return (
                        <React.Fragment key={place}>
                            {isDecimal && (
                                <div style={{
                                    height,
                                    lineHeight: `${height}px`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingBottom: height * 0.1 // Visual adjustment to align dot better
                                }}>.</div>
                            )}
                            <Digit place={place} value={value} height={height} digitStyle={digitStyle} />
                        </React.Fragment>
                    );
                })}
            </div>
            <div className="gradient-container">
                <div className="top-gradient" style={topGradientStyle ? topGradientStyle : defaultTopGradientStyle}></div>
                <div
                    className="bottom-gradient"
                    style={bottomGradientStyle ? bottomGradientStyle : defaultBottomGradientStyle}
                ></div>
            </div>
        </div>
    );
}
