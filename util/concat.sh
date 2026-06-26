#!/usr/bin/bash

dst=$rhd/project-contents.txt
>$dst
lst=$rhd/list.txt
if [ 1 -eq 0 ]
then
	cd src
	echo "only packing src ..."
	files=$(find * | grep -v node | grep -v ico$ | grep -v jpg$ | grep -v png$ | grep -v "bak/" | grep -v bak$  | grep -v dist | grep -v comments.txt | grep -v  public)
fi

if [ 1 -eq 0 ]
then
	echo "not including src ..."
	files=$(find * | grep -v node | grep -v ico$ | grep -v jpg$ | grep -v png$ | grep -v "bak/" | grep -v bak$  | grep -v dist | grep -v comments.txt | grep -v  public| grep -v src)
fi

if [ 1 -eq 1 ]
then
	echo "including everything ..."
	files=$(find * | grep -v node | grep -v ico$ | grep -v jpg$ | grep -v png$ | grep -v "bak/" | grep -v bak$  | grep -v dist | grep -v comments.txt)
fi

for i in $files
do
    	if [ ! -d $i ]
	then
		echo $i >>$lst
		echo "============="
		echo " FILE: $i"
		echo "============="
		cat $i
	fi
done >$dst
echo "=============" >>$dst
echo " FILE LIST:  " >>$dst
echo "=============" >>$dst
#find * | grep -v node  | grep -v bak$ | grep -v comments.txt >> $dst
#cat $lst
