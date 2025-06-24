import ExpoModulesCore

public class MyRustModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyRustModule")

    // 常量定义
    Constants([
      "PI": Double.pi,
      "VERSION": "1.0.0",
      "MAX_INT": Int.max,
      "SUPPORTED_OPERATIONS": ["add", "sub", "mul", "div"]
    ])

    // 事件定义
    Events("onChange", "onCalculation", "onError", "onBatchComplete")

    // === 同步函数 ===
    
    // 基础问候函数
    Function("hello") {
      return "Hello from Rust Module! 👋"
    }

    // 同步加法
    Function("syncAdd") { (a: Int32, b: Int32) -> Int32 in
      return rust_add(a, b)
    }

    // 检查操作是否支持
    Function("isOperationSupported") { (operation: String) -> Bool in
      let supportedOps = ["add", "sub", "mul", "div"]
      return supportedOps.contains(operation.lowercased())
    }

    // 获取模块统计信息
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

    // 格式化数字
    Function("formatNumber") { (number: Double, decimals: Int) -> String in
      let formatter = NumberFormatter()
      formatter.numberStyle = .decimal
      formatter.minimumFractionDigits = max(0, decimals)
      formatter.maximumFractionDigits = max(0, decimals)
      return formatter.string(from: NSNumber(value: number)) ?? String(format: "%.\(decimals)f", number)
    }

    // === 异步函数 ===

    // 基础 Rust 加法
    AsyncFunction("rustAdd") { (a: Int32, b: Int32, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        let result = rust_add(a, b)
        promise.resolve(result)
      }
    }

    // 返回字符串结果的加法
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

    // 返回 JSON 结果的加法
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

    // 通用计算函数
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
            
            // 发送计算完成事件
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

    // 批量计算
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
              let errorResult: [String: Any] = [
                "error": "JSON parse failed",
                "index": index
              ]
              results.append(errorResult)
              hasErrors = true
            }
          } catch {
            let errorResult: [String: Any] = [
              "error": "JSON parsing exception",
              "index": index,
              "details": error.localizedDescription
            ]
            results.append(errorResult)
            hasErrors = true
          }
        }
        
        // 发送批量完成事件
        self.sendEvent("onBatchComplete", [
          "totalOperations": operations.count,
          "successCount": results.count - (hasErrors ? 1 : 0),
          "hasErrors": hasErrors,
          "results": results
        ])
        
        promise.resolve(results)
      }
    }

    // 表达式计算（简单的数学表达式解析）
    AsyncFunction("evaluateExpression") { (expression: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        let trimmed = expression.trimmingCharacters(in: .whitespaces)
        
        // 支持的操作符
        let operators = ["+", "-", "*", "/"]
        var foundOperator: String?
        var operatorIndex: String.Index?
        
        // 找到操作符
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

    // 设置值并发送事件
    AsyncFunction("setValueAsync") { (value: String, promise: Promise) in
      self.sendEvent("onChange", [
        "value": value,
        "timestamp": Date().timeIntervalSince1970
      ])
      promise.resolve(["success": true, "value": value])
    }

    // 性能测试函数
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

    // Enables the module to be used as a native view. Definition components that are accepted as part of the
    // view definition: Prop, Events.
    View(MyRustModuleView.self) {
      // Defines a setter for the `url` prop.
      Prop("url") { (view: MyRustModuleView, url: URL) in
        if view.webView.url != url {
          view.webView.load(URLRequest(url: url))
        }
      }

      Events("onLoad")
    }
  }
}
