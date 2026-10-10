#include "LVGameMode.h"

#include "LoveVerseCharacter.h"
#include "LVPlayerController.h"

ALVGameMode::ALVGameMode()
{
    DefaultPawnClass = ALoveVerseCharacter::StaticClass();
    PlayerControllerClass = ALVPlayerController::StaticClass();
}
