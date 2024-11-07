echo "ServerName www.example.com:80
<Directory /var/www/foss4g_demo/htdocs/>\n\
        Options Indexes FollowSymLinks\n\
        #AllowOverride None\n\
        AllowOverride All\n\
        Require all granted\n\
</Directory>" >> /etc/apache2/apache2.conf

sed -i 's/DocumentRoot \/var\/www\/html/DocumentRoot \/var\/www\/foss4g_demo\/htdocs/' /etc/apache2/sites-available/000-default.conf
