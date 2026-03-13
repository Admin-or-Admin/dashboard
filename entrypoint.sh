#!/bin/sh

# Generate the env-config.js file based on environment variables
echo "window.env = {" > /usr/share/nginx/html/env-config.js
echo "  VITE_API_URL: \"$VITE_API_URL\"," >> /usr/share/nginx/html/env-config.js
echo "  VITE_OPENAI_API_KEY: \"$VITE_OPENAI_API_KEY\"," >> /usr/share/nginx/html/env-config.js
echo "};" >> /usr/share/nginx/html/env-config.js

# Execute the original command
exec "$@"
