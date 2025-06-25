
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MyRustModule, {
  BatchOperation,
  CalculationResult,
} from "../../modules/my-rust-module";

type JSONObject = { [key: string]: any };

const sortObjectKeys = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sortedObj: JSONObject = {};
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sortedObj[key] = sortObjectKeys(obj[key]);
    });

  return sortedObj;
};


export default function App() {
  const [num1, setNum1] = useState("");
  const [num2, setNum2] = useState("");
  const [operation, setOperation] = useState<"add" | "sub" | "mul" | "div">(
    "add"
  );
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expression, setExpression] = useState("");
  const [batchResults, setBatchResults] = useState<any[]>([]);

  useEffect(() => {
    // Setup event listeners
    MyRustModule.addListener("onCalculation", (event) => {
      console.log("Calculation event:", event);
    });

    MyRustModule.addListener("onError", (event) => {
      console.error("Error event:", event);
      Alert.alert("Error", event.error);
    });

    MyRustModule.addListener("onBatchComplete", (event) => {
      console.log("Batch complete:", event);
    });

    // Cleanup listeners on unmount
    return () => {
      MyRustModule.removeAllListeners("onCalculation");
      MyRustModule.removeAllListeners("onError");
      MyRustModule.removeAllListeners("onBatchComplete");
    };
  }, []);

  const handleBasicCalculation = async () => {
    if (!num1 || !num2) {
      Alert.alert("Error", "Please enter both numbers");
      return;
    }

    const a = parseInt(num1);
    const b = parseInt(num2);

    setIsLoading(true);
    try {
      const result = await MyRustModule.rustCalculate(a, b, operation);
      setResult(result);
    } catch (error) {
      Alert.alert("Error", `Calculation failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpressionCalculation = async () => {
    if (!expression.trim()) {
      Alert.alert("Error", "Please enter an expression");
      return;
    }

    setIsLoading(true);
    try {
      const result = await MyRustModule.evaluateExpression(expression);
      setResult(result);
    } catch (error) {
      Alert.alert("Error", `Expression evaluation failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchCalculation = async () => {
    const operations: BatchOperation[] = [
      { a: 10, b: 5, operation: "add" },
      { a: 20, b: 3, operation: "mul" },
      { a: 15, b: 3, operation: "div" },
      { a: 25, b: 7, operation: "sub" },
    ];

    setIsLoading(true);
    try {
      const results = await MyRustModule.rustBatchCalculate(operations);
      setBatchResults(results);
    } catch (error) {
      Alert.alert("Error", `Batch calculation failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runPerformanceTest = async () => {
    setIsLoading(true);
    try {
      const result = await MyRustModule.performanceTest(10000);
      Alert.alert(
        "Performance Test Results",
        `Operations: ${result.iterations}\n` +
        `Total Time: ${result.totalTime.toFixed(6)}s\n` +
        `Average Time: ${(result.averageTime * 1000000).toFixed(2)}µs\n` +
        `Ops/Second: ${result.operationsPerSecond.toFixed(0)}`
      );
    } catch (error) {
      Alert.alert("Error", `Performance test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showModuleInfo = () => {
    const info = MyRustModule.getModuleInfo();
    Alert.alert(
      "Module Information",
      `Name: ${info.name}\n` +
      `Version: ${info.version}\n` +
      `Operations: ${info.supportedOperations.join(", ")}\n` +
      `Capabilities: ${info.capabilities.length} features`
    );
  };
  const sortedResult: any = {};
  Object.keys(result || {})
    .sort()
    .forEach(key => {
      // @ts-ignore
      sortedResult[key] = result[key];
    });
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.title}>Rust Calculator Demo✅</Text>
        <Text style={styles.subtitle}>
          {MyRustModule.hello()} v{MyRustModule.VERSION}
        </Text>

        {/* Module Info */}
        <TouchableOpacity style={styles.infoButton} onPress={showModuleInfo}>
          <Text style={styles.buttonText}>Show Module Info</Text>
        </TouchableOpacity>

        {/* Basic Calculator */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Calculator✅</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="First number"
              value={num1}
              onChangeText={setNum1}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Second number"
              value={num2}
              onChangeText={setNum2}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.operationButtons}>
            {(["add", "sub", "mul", "div"] as const).map((op) => (
              <TouchableOpacity
                key={op}
                style={[
                  styles.operationButton,
                  operation === op && styles.selectedOperation,
                ]}
                onPress={() => setOperation(op)}
              >
                <Text style={styles.buttonText}>{op.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.calculateButton}
            onPress={handleBasicCalculation}
          >
            <Text style={styles.buttonText}>Calculate</Text>
          </TouchableOpacity>

          {result && (
            <Text style={styles.resultText}>
              Result: {JSON.stringify(sortObjectKeys(result), null, 1)}
            </Text>
          )}
        </View>

        {/* Expression Calculator */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expression Calculator✅</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter expression e.g. 5+3"
            value={expression}
            onChangeText={setExpression}
          />
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={handleExpressionCalculation}
          >
            <Text style={styles.buttonText}>Evaluate </Text>
          </TouchableOpacity>
        </View>

        {/* Batch Calculation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Batch Calculation✅</Text>
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={handleBatchCalculation}
          >
            <Text style={styles.buttonText}>Run Batch Calculation</Text>
          </TouchableOpacity>

          {batchResults.length > 0 && (
            <View>
              <Text style={styles.resultText}>Batch Results:</Text>
              {batchResults.map((res, index) => (
                <Text key={index} style={styles.resultText}>
                  {JSON.stringify(sortObjectKeys(res))}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Performance Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Test✅</Text>
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={runPerformanceTest}
          >
            <Text style={styles.buttonText}>Run Performance Test</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <ActivityIndicator
            style={styles.loading}
            size="large"
            color="#0000ff"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: "#198",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderColor: "#ccc",
    borderWidth: 1,
    padding: 10,
    marginRight: 5,
  },
  operationButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  operationButton: {
    padding: 10,
    backgroundColor: "#ddd",
  },
  selectedOperation: {
    backgroundColor: "#28a745",
  },
  calculateButton: {
    backgroundColor: "#007bff",
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
