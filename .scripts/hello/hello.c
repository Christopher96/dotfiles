#include <stdio.h>
#include <stdlib.h>

int main () {
   printf("POLY_I3_FOCUSED : %s\n", getenv("POLY_I3_FOCUSED"));
   printf("HOME : %s\n", getenv("HOME"));
   printf("ROOT : %s\n", getenv("ROOT"));

   return(0);
}
