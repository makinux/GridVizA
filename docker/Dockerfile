FROM python:3.11-bullseye

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Tokyo

RUN apt-get update && apt-get -y install locales && \
    localedef -f UTF-8 -i ja_JP ja_JP.UTF-8
ENV LANG ja_JP.UTF-8
ENV LANGUAGE ja_JP:ja
ENV LC_ALL ja_JP.UTF-8
ENV TERM xterm

RUN apt-get update && apt-get install -y apache2 apache2-utils apache2-dev ssl-cert vim

WORKDIR /var/www/foss4g_demo

COPY ./docker/setup.sh ./

RUN chmod 755 /var/www/foss4g_demo/setup.sh && /var/www/foss4g_demo/setup.sh

EXPOSE 80
CMD ["apachectl", "-D", "FOREGROUND"]