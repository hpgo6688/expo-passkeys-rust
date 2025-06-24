use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use reqwest::{self,header};
use serde_json::json;

// 原始的加法函数
#[unsafe(no_mangle)]
pub extern "C" fn rust_add(left: i32, right: i32) -> i32 {
    left + right
}

// 返回字符串的函数
#[unsafe(no_mangle)]
pub extern "C" fn rust_add_string(left: i32, right: i32) -> *mut c_char {
    let result = left + right;
    let result_str = format!("The sum of {} and {} is {}", left, right, result);
    
    match CString::new(result_str) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

// 返回 JSON 数据的函数
#[unsafe(no_mangle)]
pub extern "C" fn rust_add_json(left: i32, right: i32) -> *mut c_char {
    let result = left + right;
    let json_data = json!({
        "operation": "addition",
        "operands": {
            "left": left,
            "right": right
        },
        "result": result,
        "timestamp": chrono::Utc::now().to_rfc3339()
    });
    
    let json_string = json_data.to_string();
    
    match CString::new(json_string) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

// 释放字符串内存的函数（重要！）
#[unsafe(no_mangle)]
pub extern "C" fn rust_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe {
            let _ = CString::from_raw(ptr);
        }
    }
}

// 更复杂的 JSON 数据返回函数
#[unsafe(no_mangle)]
pub extern "C" fn rust_calculate_json(
    left: i32, 
    right: i32,
    operation: *const c_char
) -> *mut c_char {
    if operation.is_null() {
        return std::ptr::null_mut();
    }
    
    let operation_str = unsafe {
        match CStr::from_ptr(operation).to_str() {
            Ok(s) => s,
            Err(_) => return std::ptr::null_mut(),
        }
    };
    
    let (result, op_name) = match operation_str {
        "add" => (left + right, "addition"),
        "sub" => (left - right, "subtraction"),
        "mul" => (left * right, "multiplication"),
        "div" => {
            if right == 0 {
                let error_json = json!({
                    "error": "Division by zero",
                    "operands": {
                        "left": left,
                        "right": right
                    }
                });
                let json_string = error_json.to_string();
                return match CString::new(json_string) {
                    Ok(c_string) => c_string.into_raw(),
                    Err(_) => std::ptr::null_mut(),
                };
            }
            (left / right, "division")
        },
        _ => {
            let error_json = json!({
                "error": "Unknown operation",
                "supported_operations": ["add", "sub", "mul", "div"]
            });
            let json_string = error_json.to_string();
            return match CString::new(json_string) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            };
        }
    };
    
    let json_data = json!({
        "operation": op_name,
        "operands": {
            "left": left,
            "right": right
        },
        "result": result,
        "success": true,
        "timestamp": chrono::Utc::now().to_rfc3339()
    });
    
    let json_string = json_data.to_string();
    
    match CString::new(json_string) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}


// Function to perform an HTTP GET request and return the result as a C string
#[unsafe(no_mangle)]
pub extern "C" fn perform_get_request() -> *mut c_char {
    let url = "https://jsonplaceholder.typicode.com/posts";

    // Create a runtime to run the async function
    let runtime = tokio::runtime::Runtime::new().unwrap();

    let result = runtime.block_on(async {
        let client = reqwest::Client::new();
        let request = client.get(url)
            .header(header::ACCEPT, "application/json");

        match request.send().await {
            Ok(response) => match response.text().await {
                Ok(body) => CString::new(body).unwrap_or_default().into_raw(),
                Err(_) => CString::new("Failed to read response body").unwrap_or_default().into_raw(),
            },
            Err(_) => CString::new("Request failed").unwrap_or_default().into_raw(),
        }
    });

    result
}