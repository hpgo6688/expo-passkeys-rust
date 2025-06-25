#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

typedef struct User {
  int32_t id;
  const char *name;
  uintptr_t name_len;
} User;

int32_t rust_add(int32_t left, int32_t right);

char *rust_add_string(int32_t left, int32_t right);

char *rust_add_json(int32_t left, int32_t right);

void rust_free_string(char *ptr);

char *rust_calculate_json(int32_t left, int32_t right, const char *operation);

struct User create_user(int32_t id, const uint8_t *name, uintptr_t name_len);

void free_user(struct User *user);

struct User *auto_memory_create_user(int32_t id, const uint8_t *name, uintptr_t name_len);

char *perform_get_request(void);
