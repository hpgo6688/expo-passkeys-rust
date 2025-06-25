import { Link } from "expo-router";
import React from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    View
} from "react-native";

export default function RustRPC() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.header}>Rust Navigation</Text>
                <Link href="/rust/rust-calc" style={styles.link}>
                    Rust Calc
                </Link>
                <Link href="/rust/rust-obj" style={styles.link}>
                    Rust Obj
                </Link>
                <Link href="/rust/rust-rpc" style={styles.link}>
                    Rust RPC
                </Link>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#198",
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#fff',
    },
    link: {
        fontSize: 18,
        color: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginVertical: 5,
        backgroundColor: '#333',
        borderRadius: 8,
        textAlign: 'center',
    },
});

