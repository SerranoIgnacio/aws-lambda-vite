output "api_url" {
  description = "API Gateway URL (base URL for the API)"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "dynamodb_table" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.tasks.name
}
