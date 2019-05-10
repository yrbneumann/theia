#include <stdio.h>
#include <dlfcn.h>

#include "../ffmpeg.h"

int load_ffmpeg_library(struct FFMPEG_Library *library, char *library_path)
{
    void *handle = dlopen(library_path, RTLD_NOW);
    char *error = dlerror();
    if (error != NULL)
        goto error;

    void (*avcodec_register_all)(void) = dlsym(handle, "avcodec_register_all");
    error = dlerror();
    if (error != NULL)
        goto error;

    AVCodec *(*av_codec_next)(const AVCodec *c) = dlsym(handle, "av_codec_next");
    error = dlerror();
    if (error != NULL)
        goto error;

    library->avcodec_register_all = avcodec_register_all;
    library->av_codec_next = av_codec_next;
    return 0;

error:
    fprintf(stderr, "%s\n", error);
    return 1;
}
