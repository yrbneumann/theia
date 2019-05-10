#ifndef FFMPEG_H
#define FFMPEG_H

enum AVMediaType
{
    AVMEDIA_TYPE_UNKNOWN = -1, ///< Usually treated as AVMEDIA_TYPE_DATA
};

enum AVCodecID
{
    AV_CODEC_ID_H264 = 27,
};

typedef struct
{
    const char *name, *long_name;
    enum AVMediaType type;
    enum AVCodecID id;

} AVCodec;

struct FFMPEG_Library
{
    void (*avcodec_register_all)(void);
    AVCodec *(*av_codec_next)(const AVCodec *c);
};

int load_ffmpeg_library(struct FFMPEG_Library *library, char *library_path);

#endif // FFMPEG_H guard
