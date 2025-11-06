# 🐳 Dockerfile for Redis caching
FROM redis:7.4-alpine

# Copy optional config (nếu bạn muốn chỉnh cấu hình Redis)
# COPY redis.conf /usr/local/etc/redis/redis.conf

# Expose port Redis default
EXPOSE 6379

# Start Redis server
CMD ["redis-server", "--appendonly", "yes"]
