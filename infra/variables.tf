variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  default     = "046964627ae7e0f1c9182b7bc76a96b0"
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for basenative.com"
  type        = string
  default     = "aad028c0960e4ccd4eb453cae9619d83"
}

variable "domain" {
  description = "Primary domain"
  type        = string
  default     = "basenative.com"
}
