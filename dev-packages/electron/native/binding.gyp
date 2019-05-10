{
    'targets': [{
        'target_name': 'electron-ffmpeg-codecs',
        'type': 'executable',
        'sources': [
            'src/electron-ffmpeg-codecs.c',
        ],
        'conditions': [
            ['OS=="linux"', {
                'sources': [
                    'src/linux/ffmpeg.c',
                ],
                'libraries': [
                    '-ldl',
                ]
            }],
            ['OS=="mac"', {
                'sources': [
                    'src/mac/ffmpeg.c',
                ]
            }],
            ['OS=="win"', {
                'sources': [
                    'src/win/ffmpeg.c',
                ]
            }],
        ],
    }],
}
