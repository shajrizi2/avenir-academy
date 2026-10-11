# Nightly database backups to a private R2 bucket. postgres:16 matches the server, so
# pg_dump/pg_restore versions always fit; rclone talks to R2 (S3 API).
FROM postgres:16-alpine
RUN apk add --no-cache rclone tzdata
COPY --chmod=755 avenir-backup.sh /usr/local/bin/avenir-backup
COPY --chmod=755 entrypoint.sh /usr/local/bin/backup-entrypoint
ENTRYPOINT ["backup-entrypoint"]
CMD ["cron"]
HEALTHCHECK --interval=60s --timeout=5s CMD pgrep crond >/dev/null || exit 1
