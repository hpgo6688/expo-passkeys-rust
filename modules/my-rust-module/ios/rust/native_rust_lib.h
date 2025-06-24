#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

int32_t rust_add(int32_t left, int32_t right);

char *rust_add_string(int32_t left, int32_t right);

char *rust_add_json(int32_t left, int32_t right);

void rust_free_string(char *ptr);

char *rust_calculate_json(int32_t left, int32_t right, const char *operation);

char *perform_get_request(void);
