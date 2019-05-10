/********************************************************************************
 * Copyright (C) 2019 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

#include <stdlib.h>
#include <stdio.h>
#include "ffmpeg.h"

void output_json_entry(AVCodec *codec)
{
    fprintf(stdout, "{\"id\":%d,\"name\":\"%s\",\"longName\":\"%s\"}",
            codec->id, codec->name, codec->long_name);
}

int main(int argc, char *argv[])
{
    if (argc < 2)
    {
        fprintf(stderr, "Specify the path to the ffmpeg library as first argument.\n");
        return 1;
    }

    struct FFMPEG_Library ffmpeg = {NULL, NULL};
    if (load_ffmpeg_library(&ffmpeg, argv[1]))
        return 2;

    ffmpeg.avcodec_register_all();
    AVCodec *codec = ffmpeg.av_codec_next(NULL);
    fprintf(stdout, "[");
    while (1)
    {
        output_json_entry(codec);
        codec = ffmpeg.av_codec_next(codec);
        if (codec != NULL)
            printf(",");
        else
            break;
    }
    fprintf(stdout, "]\n");

    return 0;
}
