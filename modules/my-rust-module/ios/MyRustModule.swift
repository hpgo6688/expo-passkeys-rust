import ExpoModulesCore

public class MyRustModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyRustModule")

    // Constant definitions
    Constants([
      "PI": Double.pi,
      "VERSION": "1.0.0",
      "MAX_INT": Int.max,
      "SUPPORTED_OPERATIONS": ["add", "sub", "mul", "div"]
    ])

    // Event definitions
    Events("onChange", "onCalculation", "onError", "onBatchComplete")

    // === Synchronous functions ===
    
    // Basic greeting function
    Function("hello") {
      return "Hello from Rust Module! 👋"
    }

    // Synchronous addition
    Function("syncAdd") { (a: Int32, b: Int32) -> Int32 in
      return rust_add(a, b)
    }

    // Check if an operation is supported
    Function("isOperationSupported") { (operation: String) -> Bool in
      let supportedOps = ["add", "sub", "mul", "div"]
      return supportedOps.contains(operation.lowercased())
    }

    // Get module info / metadata
    Function("getModuleInfo") { () -> [String: Any] in
      return [
        "name": "MyRustModule",
        "version": "1.0.0",
        "supportedOperations": ["add", "sub", "mul", "div"],
        "capabilities": [
          "basicArithmetic",
          "stringResults",
          "jsonResults",
          "batchCalculations",
          "expressionEvaluation"
        ],
        "limits": [
          "maxInt": Int.max,
          "minInt": Int.min
        ]
      ]
    }

    // Format a number with decimal precision
    Function("formatNumber") { (number: Double, decimals: Int) -> String in
      let formatter = NumberFormatter()
      formatter.numberStyle = .decimal
      formatter.minimumFractionDigits = max(0, decimals)
      formatter.maximumFractionDigits = max(0, decimals)
      return formatter.string(from: NSNumber(value: number)) ?? String(format: "%.\(decimals)f", number)
    }

    // Create a user (unsafe memory, manual release required)
    Function("createUser") { (id: Int32, name: String) -> [String: Any] in
      let nameLen = name.utf8.count
      guard nameLen >= 0 else {
        // Handle invalid length
        return [:]
      }

      return name.withCString { cString in
        let user = create_user(id, cString, UInt(nameLen))
        return [
          "id": user.id,
          "name": String(cString: user.name)
        ]
      }
    }

    // Create user with automatic memory management (Box pointer)
    Function("autoMemoryCreateUser") { (id: Int32, name: String) -> [String: Any] in
      let nameLen = name.utf8.count
      guard nameLen >= 0 else {
        // Handle invalid length
        return [:]
      }

      return name.withCString { cString in
        let userPointer = auto_memory_create_user(id, cString, UInt(nameLen))
        defer {
          free_user(userPointer)
        }

        // Safely unwrap user pointer
        guard let userPointer = userPointer else {
          // Handle null pointer
          return [:]
        }

        return [
          "id": userPointer.pointee.id,
          "name": String(cString: userPointer.pointee.name)
        ]
      }
    }

    // === Asynchronous functions ===

    // Basic async Rust addition
    AsyncFunction("rustAdd") { (a: Int32, b: Int32, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        let result = rust_add(a, b)
        promise.resolve(result)
      }
    }

    // Return string result from addition
    AsyncFunction("rustAddString") { (a: Int32, b: Int32, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let result = rust_add_string(a, b) else {
          promise.reject("RUST_ERROR", "Failed to get string result from Rust")
          return
        }

        let swiftString = String(cString: result)
        rust_free_string(result)
        promise.resolve(swiftString)
      }
    }

    // Return JSON result from addition
    AsyncFunction("rustAddJson") { (a: Int32, b: Int32, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let result = rust_add_json(a, b) else {
          promise.reject("RUST_ERROR", "Failed to get JSON result from Rust")
          return
        }

        let jsonString = String(cString: result)
        rust_free_string(result)

        do {
          if let data = jsonString.data(using: .utf8),
             let jsonObject = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
            promise.resolve(jsonObject)
          } else {
            promise.reject("JSON_PARSE_ERROR", "Failed to parse JSON response")
          }
        } catch {
          promise.reject("JSON_PARSE_ERROR", "JSON parsing failed: \(error.localizedDescription)")
        }
      }
    }

    // General-purpose calculation function
    AsyncFunction("rustCalculate") { (a: Int32, b: Int32, operation: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        let operationCString = operation.cString(using: .utf8)
        guard let opPtr = operationCString else {
          promise.reject("INVALID_OPERATION", "Invalid operation string")
          return
        }

        guard let result = rust_calculate_json(a, b, opPtr) else {
          promise.reject("RUST_ERROR", "Calculation failed in Rust")
          return
        }

        let jsonString = String(cString: result)
        rust_free_string(result)

        do {
          if let data = jsonString.data(using: .utf8),
             let jsonObject = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
            
            // Send event on calculation success
            self.sendEvent("onCalculation", [
              "operation": operation,
              "operands": ["a": a, "b": b],
              "result": jsonObject,
              "timestamp": Date().timeIntervalSince1970
            ])
            
            promise.resolve(jsonObject)
          } else {
            promise.reject("JSON_PARSE_ERROR", "Failed to parse calculation result")
          }
        } catch {
          let errorInfo = [
            "error": "JSON parsing failed",
            "details": error.localizedDescription
          ]
          self.sendEvent("onError", errorInfo)
          promise.reject("JSON_PARSE_ERROR", error.localizedDescription)
        }
      }
    }

    // Perform batch calculations
    AsyncFunction("rustBatchCalculate") { (operations: [[String: Any]], promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        var results: [[String: Any]] = []
        var hasErrors = false

        for (index, operation) in operations.enumerated() {
          guard let a = operation["a"] as? Int32,
                let b = operation["b"] as? Int32,
                let op = operation["operation"] as? String else {
            let errorResult: [String: Any] = [
              "error": "Invalid operation format",
              "index": index,
              "expected": "{ a: number, b: number, operation: string }"
            ]
            results.append(errorResult)
            hasErrors = true
            continue
          }

          let operationCString = op.cString(using: .utf8)
          guard let opPtr = operationCString,
                let result = rust_calculate_json(a, b, opPtr) else {
            let errorResult: [String: Any] = [
              "error": "Rust calculation failed",
              "index": index,
              "operation": op
            ]
            results.append(errorResult)
            hasErrors = true
            continue
          }

          let jsonString = String(cString: result)
          rust_free_string(result)

          do {
            if let data = jsonString.data(using: .utf8),
               let jsonObject = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
              var resultWithIndex = jsonObject
              resultWithIndex["batchIndex"] = index
              results.append(resultWithIndex)
            } else {
              results.append([
                "error": "JSON parse failed",
                "index": index
              ])
              hasErrors = true
            }
          } catch {
            results.append([
              "error": "JSON parsing exception",
              "index": index,
              "details": error.localizedDescription
            ])
            hasErrors = true
          }
        }

        // Send event when batch processing is complete
        self.sendEvent("onBatchComplete", [
          "totalOperations": operations.count,
          "successCount": results.count - (hasErrors ? 1 : 0),
          "hasErrors": hasErrors,
          "results": results
        ])

        promise.resolve(results)
      }
    }

    // Evaluate simple math expression (e.g., "3 + 5")
    AsyncFunction("evaluateExpression") { (expression: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        let trimmed = expression.trimmingCharacters(in: .whitespaces)

        // Supported operators
        let operators = ["+", "-", "*", "/"]
        var foundOperator: String?
        var operatorIndex: String.Index?

        // Find the operator in expression
        for op in operators {
          if let range = trimmed.range(of: op) {
            foundOperator = op
            operatorIndex = range.lowerBound
            break
          }
        }

        guard let op = foundOperator,
              let opIndex = operatorIndex else {
          promise.reject("INVALID_EXPRESSION", "No valid operator found in expression")
          return
        }

        let leftPart = String(trimmed[..<opIndex]).trimmingCharacters(in: .whitespaces)
        let rightPart = String(trimmed[trimmed.index(after: opIndex)...]).trimmingCharacters(in: .whitespaces)

        guard let a = Int32(leftPart),
              let b = Int32(rightPart) else {
          promise.reject("INVALID_NUMBERS", "Could not parse numbers from expression")
          return
        }

        let operation = op == "+" ? "add" :
                       op == "-" ? "sub" :
                       op == "*" ? "mul" :
                       op == "/" ? "div" : "add"

        let operationCString = operation.cString(using: .utf8)
        guard let opPtr = operationCString,
              let result = rust_calculate_json(a, b, opPtr) else {
          promise.reject("CALCULATION_ERROR", "Failed to evaluate expression")
          return
        }

        let jsonString = String(cString: result)
        rust_free_string(result)

        do {
          if let data = jsonString.data(using: .utf8),
             let jsonObject = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
            var resultWithExpression = jsonObject
            resultWithExpression["originalExpression"] = expression
            promise.resolve(resultWithExpression)
          } else {
            promise.reject("JSON_PARSE_ERROR", "Failed to parse expression result")
          }
        } catch {
          promise.reject("JSON_PARSE_ERROR", error.localizedDescription)
        }
      }
    }

    // Set value and emit event
    AsyncFunction("setValueAsync") { (value: String, promise: Promise) in
      self.sendEvent("onChange", [
        "value": value,
        "timestamp": Date().timeIntervalSince1970
      ])
      promise.resolve(["success": true, "value": value])
    }

    // Performance benchmark test
    AsyncFunction("performanceTest") { (iterations: Int32, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        let startTime = CFAbsoluteTimeGetCurrent()
        var totalTime: Double = 0

        for i in 0..<iterations {
          let iterationStart = CFAbsoluteTimeGetCurrent()
          let _ = rust_add(i, i + 1)
          let iterationEnd = CFAbsoluteTimeGetCurrent()
          totalTime += (iterationEnd - iterationStart)
        }

        let endTime = CFAbsoluteTimeGetCurrent()
        let wallClockTime = endTime - startTime

        let result: [String: Any] = [
          "iterations": iterations,
          "totalTime": totalTime,
          "wallClockTime": wallClockTime,
          "averageTime": totalTime / Double(iterations),
          "operationsPerSecond": Double(iterations) / wallClockTime
        ]

        promise.resolve(result)
      }
    }

    // Perform HTTP GET request from Rust
    AsyncFunction("performGetRequest") { (promise: Promise) in
      DispatchQueue.global(qos: .background).async {
        let resultPtr = perform_get_request()
        defer { rust_free_string(resultPtr) }

        if let resultPtr = resultPtr {
          let result = String(cString: resultPtr)
          promise.resolve(result)
        } else {
          promise.reject("ERR_REQUEST_FAILED", "Failed to perform request")
        }
      }
    }

    // Define a native view that can be used in React Native/Expo
    View(MyRustModuleView.self) {
      // Defines a setter for the `url` prop
      Prop("url") { (view: MyRustModuleView, url: URL) in
        if view.webView.url != url {
          view.webView.load(URLRequest(url: url))
        }
      }

      Events("onLoad")
    }
  }
}
