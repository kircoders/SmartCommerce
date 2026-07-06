resource "aws_s3_bucket" "product_images" {
  bucket = "smartcommerce-product-images-452698428461"

  tags = { Name = "smartcommerce-product-images" }
}

resource "aws_s3_bucket_public_access_block" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "product_images_public_read" {
  bucket     = aws_s3_bucket.product_images.id
  depends_on = [aws_s3_bucket_public_access_block.product_images]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.product_images.arn}/*"
    }]
  })
}

resource "aws_s3_bucket_cors_configuration" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
  }
}

# Allow the App Runner instance role to upload/delete images
resource "aws_iam_role_policy" "apprunner_s3" {
  name = "smartcommerce-apprunner-s3-policy"
  role = aws_iam_role.apprunner_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObject"
      ]
      Resource = "${aws_s3_bucket.product_images.arn}/*"
    }]
  })
}
