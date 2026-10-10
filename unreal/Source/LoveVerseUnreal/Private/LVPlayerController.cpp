#include "LVPlayerController.h"

void ALVPlayerController::BeginPlay()
{
    Super::BeginPlay();
    bShowMouseCursor = true;
    DefaultMouseCursor = EMouseCursor::Default;
}
