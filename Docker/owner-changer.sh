#!/bin/bash
# Collect static files

if id "$1" >/dev/null 2>&1; then
        echo "www-data user exist."
        echo "changing volume owner.."
        chown -R www-data:www-data /var/www/html/mpmanager
        echo "Volume owner changed to www-data."
else
         echo "www-data user does not exist."
         echo "Volume owner could not be changed, please adjust your permission setting for web server."
fi


php-fpm
