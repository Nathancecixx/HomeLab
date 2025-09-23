FROM alpine:3.20
RUN apk add --no-cache tor bash netcat-openbsd
COPY start-tor.sh /usr/local/bin/start-tor.sh
RUN chmod +x /usr/local/bin/start-tor.sh
WORKDIR /var/lib/tor
ENTRYPOINT ["/usr/local/bin/start-tor.sh"]