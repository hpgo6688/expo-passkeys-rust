import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MyRustModule from '../../modules/my-rust-module';

const UserComponent: React.FC = () => {
    const [user, setUser] = useState<{ id: number; name: string } | null>(null);
    const [id, setId] = useState('1');
    const [name, setName] = useState('hello');

    const handleCreateUser = async () => {
        try {
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                console.error('Invalid ID');
                return;
            }
            const newUser = await MyRustModule.createUser(parsedId, name);
            setUser(newUser);
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    const handleAutoMemoryCreateUser = async () => {
        try {
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
                console.error('Invalid ID');
                return;
            }
            const newUser = await MyRustModule.autoMemoryCreateUser(parsedId, name);
            setUser(newUser);
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Enter ID"
                keyboardType="numeric"
                value={id}
                onChangeText={setId}
            />
            <TextInput
                style={styles.input}
                placeholder="Enter Name"
                value={name}
                onChangeText={setName}
            />
            <View style={styles.buttonContainer}>
                <Pressable style={styles.button} onPress={handleCreateUser}>
                    <Text style={styles.buttonText}>Create User</Text>
                </Pressable>
                <Pressable style={styles.button} onPress={handleAutoMemoryCreateUser}>
                    <Text style={styles.buttonText}>Auto Memory Create User</Text>
                </Pressable>
            </View>
            {user && (
                <View style={styles.userInfo}>
                    <Text style={styles.userText}>User: {JSON.stringify(user, null, 2)}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 10
    },
    input: {
        width: '80%',
        padding: 10,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
    },
    userInfo: {
        marginTop: 20,
        alignItems: 'center',
    },
    userText: {
        fontSize: 14,
    },
    buttonContainer: {
        width: '80%',
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
    },
    button: {
        backgroundColor: "#007bff",
        padding: 10,
        alignItems: "center",
        borderRadius: 5,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
    },
});

export default UserComponent;
