import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MyRustModule from "../../modules/my-rust-module";

export default function RustRPC() {
  const [result, setResult] = useState<{id:number, body:string, title: string, userId:string}[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRustGet = async () => {
    setIsLoading(true);
    MyRustModule.performGetRequest()
      .then((response) => {
        console.log("HTTP Response:", response);
        setResult(JSON.parse(response));
      })
      .catch((error) => {
        console.error("Error:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Rust RPC Demo✅</Text>

        {/* Module Info */}
        <TouchableOpacity style={styles.infoButton} onPress={handleRustGet}>
          <Text style={styles.buttonText}>RPC GET</Text>
        </TouchableOpacity>

        {isLoading && (
          <ActivityIndicator
            style={styles.loading}
            size="large"
            color="#0000ff"
          />
        )}

        <FlatList
          data={result}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.title}>{item.title}</Text>
              <Text>{item.body}</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: "#fff",
  },
  item: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  calculateButton: {
    backgroundColor: "#28a745",
    padding: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  resultText: {
    marginTop: 10,
    fontSize: 16,
  },
  loading: {
    marginTop: 20,
  },
  infoButton: {
    backgroundColor: "#007bff",
    padding: 10,
    alignItems: "center",
    marginBottom: 20,
    borderRadius: 5,
  },
});
