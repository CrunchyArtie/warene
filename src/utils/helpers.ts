const toVolumeNumber = (volume: string): number => {
    if (volume === '0/1') return 1;

    return +volume.split('/')[0].trim() || 0;
}

export {toVolumeNumber};

