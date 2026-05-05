FROM nginx:alpine
COPY dist /usr/share/nginx/html
RUN apk add --no-cache zip && \
    cd /usr/share/nginx/html && \
    zip -r /extension.zip . && \
    echo "Extension packaged at /extension.zip"
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
